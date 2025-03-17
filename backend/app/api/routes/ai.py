from app.core.config import PREBUILT_AI_USER_ID
from app.core.stream_client import server_client
from app.schemas.ai import NewMessageRequest
from app.services.ai.helpers import clean_channel_id
from app.services.ai.openai_agent import OpenAIAgent
from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.post("/new-message")
async def ai_new_message(request: NewMessageRequest):
    """
    Endpoint to generate an AI response for a new message.
    It:
      - Validates and cleans the channel id.
      - Retrieves the channel.
      - Ensures the prebuilt AI user is a member.
      - Updates user memory in background.
      - Creates an OpenAIAgent to process and stream the AI response.
    """
    print("[DEBUG] Received new-message request:")
    print(request)

    if not request.cid:
        raise HTTPException(status_code=400, detail="Missing required field: cid")

    # Extract user id from the request
    if hasattr(request, "user") and request.user:
        user_id = request.user.get("id")
    elif "user" in request.message:
        user_id = request.message["user"].get("id")
    else:
        raise HTTPException(status_code=400, detail="Missing user information")

    # Clean the channel id.
    channel_id = clean_channel_id(request.cid)
    print(f"[DEBUG] Final channel_id: {channel_id}")

    # Retrieve the channel.
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

    # Instantiate the OpenAIAgent and let it process the message.
    agent = OpenAIAgent(chat_client=server_client, channel=channel)
    await agent.handle_message(request, user_id)
    return {"message": "Message processing started."}
