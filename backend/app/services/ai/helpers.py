from stream_chat import StreamChatAsync
from typing import Any, List


def clean_channel_id(channel_id: str) -> str:
    """If the channel_id contains a colon, return the part after it."""
    print(f"[DEBUG] Cleaning channel id: {channel_id}")
    if ":" in channel_id:
        parts = channel_id.split(":")
        if len(parts) > 1:
            cleaned = parts[1]
            print(f"[DEBUG] Cleaned channel id: {cleaned}")
            return cleaned
    return channel_id


async def get_last_messages_from_channel(
        chat_client: StreamChatAsync, channel_id: str, limit: int = 50
) -> List[Any]:
    """
    Retrieve the last messages from a channel.
    Returns a list of dicts containing the content and the role.
    """
    print(f"[DEBUG] Retrieving last {limit} messages for channel: {channel_id}")
    channel_filters = {"cid": channel_id}
    message_filters = {"type": {"$eq": "regular"}}
    sort = {"updated_at": -1}  # Descending: latest messages first
    message_search = await chat_client.search(channel_filters, message_filters, sort, limit=limit)
    messages = [
        {
            "content": msg["message"]["text"].strip(),
            "role": "assistant" if msg["message"]["user"]["id"].startswith("ai-bot") else "user"
        }
        for msg in message_search["results"]
        if msg["message"]["text"] != ""
    ]
    # Reverse the messages to get them in chronological order.
    messages = list(reversed(messages))
    print(f"[DEBUG] Retrieved messages: {messages}")
    return messages
