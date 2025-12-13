"""
Authentication schemas.
"""
from pydantic import BaseModel, EmailStr


class Token(BaseModel):
    """JWT token response schema."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Token payload data."""
    user_id: str | None = None
    email: str | None = None


class LoginRequest(BaseModel):
    """Login request schema."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """User response schema (without password)."""
    id: str
    shop_id: str | None
    name: str
    email: str
    role: str
    is_active: bool
    last_login: str | None
    
    class Config:
        from_attributes = True

