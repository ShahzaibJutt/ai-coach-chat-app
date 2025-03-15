from app.core.database import Base
from sqlalchemy import Column, Integer, String, Boolean, DateTime, func


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user")
    disabled = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
