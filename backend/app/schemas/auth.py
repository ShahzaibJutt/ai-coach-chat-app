from pydantic import BaseModel


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    full_name: str = None


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterResponse(BaseModel):
    message: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
