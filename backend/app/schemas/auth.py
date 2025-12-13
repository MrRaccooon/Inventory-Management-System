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


class RegisterRequest(BaseModel):
    """User registration schema."""
    name: str
    email: EmailStr
    password: str
    shop_name: str | None = None  # For owners creating new shop
    shop_id: str | None = None  # For staff joining existing shop
    role: str = "staff"  # owner, manager, staff, auditor, admin
    gst_number: str | None = None  # For shop registration


class ForgotPasswordRequest(BaseModel):
    """Forgot password request schema."""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Reset password request schema."""
    token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    """Change password request schema."""
    current_password: str
    new_password: str


class UpdateProfileRequest(BaseModel):
    """Update user profile schema."""
    name: str | None = None
    email: EmailStr | None = None


class VerifyEmailRequest(BaseModel):
    """Email verification request schema."""
    token: str


class ResendVerificationRequest(BaseModel):
    """Resend verification email request schema."""
    email: EmailStr


class UserResponse(BaseModel):
    """User response schema (without password)."""
    id: str
    shop_id: str | None
    name: str
    email: str
    role: str
    is_active: bool
    email_verified: bool = False
    last_login: str | None
    
    class Config:
        from_attributes = True

