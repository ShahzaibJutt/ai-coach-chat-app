import asyncio
from app.core.config import PREBUILT_AI_USER_ID, OPENAI_API_KEY
from app.core.memory_manager import user_memories
from app.core.stream_client import server_client
from app.schemas.ai import NewMessageRequest
from app.services.ai.helpers import clean_channel_id, get_last_messages_from_channel
from app.services.ai.memory_service import update_user_memory
from fastapi import APIRouter, HTTPException
from openai import AsyncOpenAI
from typing import List, Dict

router = APIRouter()


@router.post("/new-message")
async def ai_new_message(request: NewMessageRequest):
    """
    Endpoint to generate an AI response for a new message.

    Steps:
      - Validate and clean the channel id.
      - Retrieve the channel.
      - Ensure the prebuilt AI user is added as a member.
      - Extract user information from the request and update memory asynchronously.
      - Retrieve up to 50 previous messages using the proper channel cid.
      - Prepend a system prompt (including user memory context) to the conversation history.
      - Append the current user message.
      - Use OpenAI to generate a streaming response.
      - Send the final AI response to the channel.
    """
    print("[DEBUG] Received new-message request:")
    print(request)
    if not request.cid:
        raise HTTPException(status_code=400, detail="Missing required field: cid")

    if hasattr(request, "user") and request.user:
        # If it's a dict, use .get()
        user_id = request.user.get("id")
    elif "user" in request.message:
        user_id = request.message["user"].get("id")
    else:
        raise HTTPException(status_code=400, detail="Missing user information")

    # Clean the channel id.
    channel_id = clean_channel_id(request.cid)
    print(f"[DEBUG] Final channel_id: {channel_id}")

    try:
        channel = server_client.channel("messaging", channel_id)
        print(f"[DEBUG] Retrieved channel for id: {channel_id}")
    except Exception as e:
        print(f"[ERROR] Error retrieving channel: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving channel: {str(e)}")

    # Ensure the prebuilt AI user is a member of the channel.
    try:
        print(f"[DEBUG] Adding prebuilt AI user '{PREBUILT_AI_USER_ID}' as a member...")
        await channel.add_members([PREBUILT_AI_USER_ID])
        print("[DEBUG] Successfully added AI user to channel.")
    except Exception as e:
        print(f"[WARNING] Could not add AI user to channel: {e}")

    # Validate and get the new user message.
    if not request.message or "text" not in request.message:
        raise HTTPException(status_code=400, detail="Missing message text")
    user_message = request.message["text"]
    print(f"[DEBUG] User message: {user_message}")

    # Retrieve the current memory for this user.
    current_memory = user_memories.get(user_id, "")
    print(f"[DEBUG] Current memory for user {user_id}: {current_memory}")

    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    print("[DEBUG] Initializing OpenAI client...")
    openai = AsyncOpenAI(api_key=OPENAI_API_KEY)

    # Prepare the prompt for memory update.
    update_prompt = (
        f"Extract useful information from the following message that could help build a long-term context "
        f"for this user to achieve their goals. The current memory is:\n\n{current_memory}\n\n"
        f"New message: {user_message}\n\n"
        "Return the updated memory as a plain text paragraph."
    )

    # Launch the memory update as a background task (fire-and-forget).
    async def update_memory_background():
        try:
            new_memory = await update_user_memory(openai, update_prompt)
            user_memories[user_id] = new_memory
            print(f"[DEBUG] Background updated memory: {new_memory}")
        except Exception as e:
            print(f"[ERROR] Background memory update error: {e}")

    asyncio.create_task(update_memory_background())

    # Use the current memory (which may not yet be updated) for the system prompt.
    system_prompt = {
        "role": "system",
        "content": f"You are an AI coach; you are here to help the user achieve their goals. "
                   f"User context: {current_memory}"
    }

    # Retrieve conversation history (up to 50 messages) sorted in chronological order.
    history: List[Dict[str, str]] = []
    try:
        history = await get_last_messages_from_channel(server_client, channel.cid, limit=50)
        print(f"[DEBUG] Retrieved conversation history with {len(history)} messages.")
    except Exception as e:
        print(f"[WARNING] Could not retrieve conversation history: {e}")

    # Prepend the system prompt.
    history.insert(0, system_prompt)
    # Append the current user message.
    history.append({"role": "user", "content": user_message})
    # print(f"[DEBUG] Final conversation history for context: {history}")

    # Call OpenAI API to generate the coaching response.
    try:
        print("[DEBUG] Calling OpenAI API for response generation...")
        response_stream = await openai.chat.completions.create(
            max_tokens=1024,
            messages=history,
            model="gpt-4o-mini",
            stream=True,
        )
    except Exception as e:
        print(f"[ERROR] OpenAI API error: {e}")
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")

    # Accumulate the streaming response chunk by chunk.
    generated_text = ""
    try:
        async for chunk in response_stream:
            if (
                    hasattr(chunk, "choices")
                    and len(chunk.choices) > 0
                    and hasattr(chunk.choices[0], "delta")
                    and hasattr(chunk.choices[0].delta, "content")
                    and chunk.choices[0].delta.content is not None
            ):
                delta = chunk.choices[0].delta.content
                # print(f"[DEBUG] Received chunk: {delta}")
                generated_text += delta
    except Exception as e:
        print(f"[ERROR] Error processing response stream: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing response stream: {str(e)}")

    # print(f"[DEBUG] Final generated AI text: {generated_text}")

    # Send the generated AI response as a message to the channel.
    try:
        print("[DEBUG] Sending generated message to channel...")
        result = await channel.send_message(
            {"text": generated_text, "ai_generated": True},
            PREBUILT_AI_USER_ID
        )
        # print(f"[DEBUG] Message sent. Result: {result}")
    except Exception as e:
        print(f"[ERROR] Error sending message: {e}")
        raise HTTPException(status_code=500, detail=f"Error sending message: {str(e)}")

    return {"message": "Message processed successfully", "ai_text": generated_text}
