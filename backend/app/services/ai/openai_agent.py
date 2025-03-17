import asyncio
from app.core.config import OPENAI_API_KEY, PREBUILT_AI_USER_ID
from app.core.memory_manager import user_memories
from app.core.stream_client import server_client
from app.schemas.ai import NewMessageRequest
from app.services.ai.helpers import get_last_messages_from_channel
from app.services.ai.memory_service import update_user_memory
from fastapi import HTTPException
from openai import AsyncOpenAI
from typing import Any, List, Dict


class OpenAIAgent:
    """
    Agent that uses the OpenAI API to generate a streaming AI response.
    It manages its own state and handles each streaming chunk.
    """

    def __init__(self, chat_client, channel):
        if not OPENAI_API_KEY:
            raise ValueError("OpenAI API key not configured")
        self.openai = AsyncOpenAI(api_key=OPENAI_API_KEY)
        self.chat_client = chat_client
        self.channel = channel

        # State variables for streaming response
        self.message_text = ""
        self.chunk_counter = 0

    async def dispose(self):
        """Dispose of the agent."""
        self.channel = None
        # await self.chat_client.close()
        await self.openai.close()

    async def handle_message(self, request: NewMessageRequest, user_id: str):
        """
        Process a new incoming message:
          - Validate the message.
          - Launch a background task to update user memory using the helper.
          - Retrieve conversation history via the helper.
          - Build a system prompt using the current memory.
          - Send an empty AI message to the channel.
          - Stream the OpenAI response and handle each chunk.
        """
        # Validate incoming message text.
        if not request.message or "text" not in request.message:
            raise HTTPException(status_code=400, detail="Missing message text")
        user_message = request.message["text"]

        # Retrieve current memory and prepare a prompt for memory update.
        current_memory = user_memories.get(user_id, "")
        update_prompt = (
            f"Extract useful information from the following message that could help build a long-term context "
            f"for this user to achieve their goals. The current memory is:\n\n{current_memory}\n\n"
            f"New message: {user_message}\n\n"
            "Return the updated memory as a plain text paragraph."
        )

        # Launch the update in the background (helper remains external)
        async def update_memory_background():
            try:
                new_memory = await update_user_memory(self.openai, update_prompt)
                user_memories[user_id] = new_memory
                print(f"[DEBUG] Background updated memory: {new_memory}")
            except Exception as e:
                print(f"[ERROR] Background memory update error: {e}")

        asyncio.create_task(update_memory_background())

        # Build system prompt using current memory.
        system_prompt = {
            "role": "system",
            "content": (
                "You are an AI coach; you are here to help the user achieve their goals. "
                f"User context: {current_memory}"
                "Only output information on user context when user specifically asked about it or asked a relevant question."
            )
        }

        # Retrieve conversation history (up to 50 messages) using an external helper.
        history: List[Dict[str, str]] = []
        try:
            history = await get_last_messages_from_channel(
                server_client, self.channel.cid, limit=50
            )
            print(f"[DEBUG] Retrieved conversation history with {len(history)} messages.")
        except Exception as e:
            print(f"[WARNING] Could not retrieve conversation history: {e}")

        # Prepend system prompt and append the current user message.
        # Prepend system prompt to conversation history.
        history.insert(0, system_prompt)

        # Only append the current user message if it isn't already the last entry.
        if not history or history[-1].get("role") != "user" or history[-1].get("content") != user_message:
            history.append({"role": "user", "content": user_message})

        print("DEBUG: history:", history)

        # Send an initial empty AI message to the channel to start the streaming process.
        channel_message = await self.channel.send_message(
            {"text": "", "ai_generated": True}, PREBUILT_AI_USER_ID
        )
        message_id = channel_message["message"]["id"]
        print("[DEBUG] Message id:", message_id)

        # Signal that the AI is thinking.
        if message_id:
            await self.channel.send_event(
                {
                    "type": "ai_indicator.update",
                    "ai_state": "AI_STATE_THINKING",
                    "message_id": message_id,
                },
                PREBUILT_AI_USER_ID,
            )

        # Start the streaming call to OpenAI.
        try:
            openai_stream = await self.openai.chat.completions.create(
                max_tokens=1024,
                messages=list(history),  # reverse history so the most recent messages come first
                model="gpt-4o-mini",
                stream=True,
            )

            async for chunk in openai_stream:
                await self.handle(chunk, message_id, PREBUILT_AI_USER_ID)

            await self.channel.send_event(
                {
                    "type": "ai_indicator.clear",
                    "message_id": message_id,
                },
                PREBUILT_AI_USER_ID,
            )
        except Exception as error:
            print("Error in message handling:", error)
            await self.channel.send_event(
                {
                    "type": "ai_indicator.update",
                    "ai_state": "AI_STATE_ERROR",
                    "message_id": message_id,
                },
                PREBUILT_AI_USER_ID,
            )

    async def handle(self, chunk: Any, message_id: str, bot_id: str):
        """
        Handle a single chunk from the OpenAI Chat Completions streaming response.
        Incrementally update the message text and send periodic UI updates.
        """
        try:
            # For the first chunk, send a generating indicator.
            if self.chunk_counter == 0:
                await self.channel.send_event(
                    {
                        "type": "ai_indicator.update",
                        "ai_state": "AI_STATE_GENERATING",
                        "message_id": message_id,
                    },
                    bot_id,
                )
                await asyncio.sleep(0.1)

            # If the chunk contains delta text, append it.
            if (
                    hasattr(chunk, "choices")
                    and len(chunk.choices) > 0
                    and hasattr(chunk.choices[0], "delta")
                    and hasattr(chunk.choices[0].delta, "content")
                    and chunk.choices[0].delta.content is not None
            ):
                delta_text = chunk.choices[0].delta.content
                self.message_text += delta_text
                self.chunk_counter += 1

                # Update the channel message periodically to avoid spamming.
                if self.chunk_counter % 15 == 0 or (
                        self.chunk_counter < 8 and self.chunk_counter % 2 == 0
                ):
                    try:
                        await self.chat_client.update_message_partial(
                            message_id,
                            {"set": {"text": self.message_text, "generating": True}},
                            bot_id,
                        )
                        await asyncio.sleep(0.05)
                    except Exception as error:
                        print("Error updating message:", error)

            # When finish_reason is present, do a final update.
            if (
                    hasattr(chunk, "choices")
                    and len(chunk.choices) > 0
                    and chunk.choices[0].finish_reason is not None
            ):
                await asyncio.sleep(0.5)
                await self.chat_client.update_message_partial(
                    message_id,
                    {"set": {"text": self.message_text, "generating": False}},
                    bot_id,
                )
                await self.channel.send_event(
                    {
                        "type": "ai_indicator.clear",
                        "message_id": message_id,
                    },
                    bot_id,
                )
        except Exception as e:
            print(f"Error handling chunk: {str(e)}")
            await self.channel.send_event(
                {
                    "type": "ai_indicator.update",
                    "ai_state": "AI_STATE_ERROR",
                    "message_id": message_id,
                },
                bot_id,
            )
            raise
