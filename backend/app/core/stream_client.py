from stream_chat import StreamChat
from app.core.config import STREAM_API_KEY, STREAM_API_SECRET

# Create a single Stream Chat client instance.
print("Creating Stream Chat client instance")
print(STREAM_API_KEY, STREAM_API_SECRET)
client = StreamChat(api_key=STREAM_API_KEY, api_secret=STREAM_API_SECRET)
