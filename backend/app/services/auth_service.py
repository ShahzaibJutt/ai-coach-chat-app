import bcrypt
import jwt
from app.core.config import SECRET_KEY
from app.core.models import User
from app.core.stream_client import client
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day


def get_password_hash(password: str) -> str:
    # Hash the password and decode bytes to a UTF-8 string for storage
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    # bcrypt.checkpw expects both parameters as bytes
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta if expires_delta else timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def register_user_service(username: str, password: str, email: str, full_name: str = None,
                          db: Session = None) -> dict:
    # Ensure username is provided
    if not username:
        raise ValueError("Email must be provided")

    # Check if the email is already registered
    existing_user = db.query(User).filter((User.username == username) | (User.email == email)).first()
    if existing_user:
        raise ValueError("Email or username already registered")

    hashed_password = get_password_hash(password)
    new_user = User(
        # Use email as the unique identifier and username
        username=username,
        email=email,
        full_name=full_name,
        hashed_password=hashed_password,
        role="user",
        disabled=False
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Upsert user in Stream Chat using email as the unique ID
    try:
        client.upsert_user({
            "id": username,
            "name": full_name or username,
            "role": "user",
            "email": email
        })
    except Exception as e:
        print("Error upserting user in Stream Chat:", e)

    # Return a success message instead of generating a token
    return {"message": "User registered successfully. Please log in."}


def login_user_service(username: str, password: str, db: Session = None) -> dict:
    # Query user by username
    print("username: ", username)
    user = db.query(User).filter(User.username == username).first()
    print("user: ", user)
    if not user or not verify_password(password, user.hashed_password):
        raise ValueError("Incorrect username or password")

    # Generate a Stream Chat token using the user's username
    stream_token = client.create_token(user.username)

    return {"access_token": stream_token, "token_type": "bearer"}
