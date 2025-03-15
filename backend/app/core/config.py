import os
from dotenv import load_dotenv

load_dotenv()  # Loads environment variables from a .env file

# Stream Chat credentials
STREAM_API_KEY = os.getenv("STREAM_API_KEY")
STREAM_API_SECRET = os.getenv("STREAM_API_SECRET")

# JWT secret key (used to sign JWT tokens)
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")

# Database path
DB_PATH = os.getenv("DB_PATH", "stream_chat_app.db")
