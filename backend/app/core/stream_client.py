from app.core.config import STREAM_API_KEY, STREAM_API_SECRET
from stream_chat import StreamChat, StreamChatAsync

# Create a single Stream Chat client instance.
print("Creating Stream Chat client instance")
client = StreamChat(api_key=STREAM_API_KEY, api_secret=STREAM_API_SECRET)

# Create a single Stream Chat client instance for asynchronous operations.
print("Creating Stream Chat async client instance")
server_client = StreamChatAsync(
    api_key=STREAM_API_KEY,
    api_secret=STREAM_API_SECRET
)
