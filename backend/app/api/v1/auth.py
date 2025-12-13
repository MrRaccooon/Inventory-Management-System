"""
Authentication API endpoints.
Handles user login, token generation, and user information.
"""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.utils.auth import (
    verify_password,
    create_access_token,
    get_current_active_user,
    get_password_hash
)
from app.schemas.auth import (
    Token, UserResponse, LoginRequest, RegisterRequest,
    ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest,
    UpdateProfileRequest, VerifyEmailRequest, ResendVerificationRequest
)
from app.config import settings
from app.models.shop import Shop
import uuid
import secrets
from datetime import datetime, timedelta

# In-memory storage for tokens (in production, use Redis or database)
password_reset_tokens = {}
email_verification_tokens = {}

router = APIRouter()


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    User login endpoint.
    Returns JWT access token for authenticated users.
    
    Args:
        form_data: OAuth2 form data (username=email, password)
        db: Database session
        
    Returns:
        Token object with access_token
        
    Raises:
        HTTPException: If credentials are invalid
    """
    # Find user by email (username field in OAuth2)
    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Update last login
    from datetime import datetime
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login/json", response_model=Token)
async def login_json(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    User login endpoint (JSON body version).
    Alternative to OAuth2 form-based login.
    
    Args:
        login_data: Login request with email and password
        db: Database session
        
    Returns:
        Token object with access_token
    """
    user = db.query(User).filter(User.email == login_data.email).first()
    
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Update last login
    from datetime import datetime
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    register_data: RegisterRequest,
    db: Session = Depends(get_db)
):
    """
    User registration endpoint.
    Creates a new user account and optionally a new shop.
    
    For owners: Provide shop_name to create a new shop
    For staff/managers: Provide shop_id to join an existing shop
    
    Args:
        register_data: Registration data including name, email, password, and shop info
        db: Database session
        
    Returns:
        Created user information
        
    Raises:
        HTTPException: If email already exists or validation fails
    """
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == register_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate role
    valid_roles = ['owner', 'manager', 'staff', 'auditor', 'admin']
    if register_data.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
        )
    
    shop_id = None
    
    # Handle shop creation for owners
    if register_data.role == 'owner':
        if not register_data.shop_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Shop name is required for owner registration"
            )
        
        # Create new shop
        new_shop = Shop(
            id=uuid.uuid4(),
            name=register_data.shop_name,
            gst_number=register_data.gst_number,
            timezone="UTC",
            currency="INR"
        )
        db.add(new_shop)
        db.flush()  # Get the shop ID
        shop_id = new_shop.id
        
        # Update owner_user_id after user is created (will be set below)
        
    elif register_data.shop_id:
        # Validate shop exists for non-owner roles
        shop = db.query(Shop).filter(Shop.id == register_data.shop_id).first()
        if not shop:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shop not found"
            )
        shop_id = uuid.UUID(register_data.shop_id)
    
    # Create new user
    hashed_password = get_password_hash(register_data.password)
    new_user = User(
        id=uuid.uuid4(),
        shop_id=shop_id,
        name=register_data.name,
        email=register_data.email,
        password_hash=hashed_password,
        role=register_data.role,
        is_active=True
    )
    
    db.add(new_user)
    
    # Update shop owner if this is an owner registration
    if register_data.role == 'owner' and shop_id:
        shop = db.query(Shop).filter(Shop.id == shop_id).first()
        if shop:
            shop.owner_user_id = new_user.id
    
    db.commit()
    db.refresh(new_user)
    
    # Generate email verification token
    verification_token = secrets.token_urlsafe(32)
    email_verification_tokens[verification_token] = {
        "user_id": str(new_user.id),
        "email": new_user.email,
        "expires_at": datetime.utcnow() + timedelta(hours=24)
    }
    
    # In production, send verification email here
    # For now, we'll just track the user needs to verify
    
    return new_user


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    User logout endpoint.
    
    Note: Since we use JWT tokens, actual token invalidation happens client-side
    by removing the token. This endpoint is for tracking logout events.
    
    Args:
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Logout confirmation message
    """
    # Optional: Track logout time or create audit log
    # For now, we just return a success message
    # The client should delete the JWT token
    
    return {
        "message": "Successfully logged out",
        "detail": "Please delete the authentication token from your client"
    }


@router.post("/forgot-password")
async def forgot_password(
    request_data: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Request password reset.
    Generates a reset token for the user.
    
    Note: In production, this token should be sent via email.
    For now, it's returned in the response for testing.
    
    Args:
        request_data: Email address
        db: Database session
        
    Returns:
        Success message with reset token (for testing)
    """
    user = db.query(User).filter(User.email == request_data.email).first()
    
    # Always return success (don't reveal if email exists)
    if user:
        # Generate secure random token
        reset_token = secrets.token_urlsafe(32)
        
        # Store token with expiration (30 minutes)
        password_reset_tokens[reset_token] = {
            "user_id": str(user.id),
            "email": user.email,
            "expires_at": datetime.utcnow() + timedelta(minutes=30)
        }
    
    return {
        "message": "If the email exists, a password reset link has been sent",
        "reset_token": reset_token if user else None  # Remove in production
    }


@router.post("/reset-password")
async def reset_password(
    request_data: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Reset password using token.
    
    Args:
        request_data: Reset token and new password
        db: Database session
        
    Returns:
        Success message
    """
    # Verify token
    token_data = password_reset_tokens.get(request_data.token)
    
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Check expiration
    if datetime.utcnow() > token_data["expires_at"]:
        del password_reset_tokens[request_data.token]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired"
        )
    
    # Update password
    user = db.query(User).filter(User.id == token_data["user_id"]).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.password_hash = get_password_hash(request_data.new_password)
    db.commit()
    
    # Remove used token
    del password_reset_tokens[request_data.token]
    
    return {"message": "Password has been reset successfully"}


@router.post("/change-password")
async def change_password(
    request_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Change password for authenticated user.
    
    Args:
        request_data: Current and new password
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Success message
    """
    # Verify current password
    if not verify_password(request_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    current_user.password_hash = get_password_hash(request_data.new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}


@router.patch("/profile", response_model=UserResponse)
async def update_profile(
    request_data: UpdateProfileRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update user profile.
    
    Args:
        request_data: Profile data to update
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Updated user information
    """
    # Update name if provided
    if request_data.name is not None:
        current_user.name = request_data.name
    
    # Update email if provided
    if request_data.email is not None:
        # Check if email is already taken by another user
        existing_user = db.query(User).filter(
            User.email == request_data.email,
            User.id != current_user.id
        ).first()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )
        
        current_user.email = request_data.email
    
    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    
    return current_user


@router.post("/verify-email")
async def verify_email(
    request_data: VerifyEmailRequest,
    db: Session = Depends(get_db)
):
    """
    Verify user email with token.
    
    Args:
        request_data: Verification token
        db: Database session
        
    Returns:
        Success message
    """
    # Verify token
    token_data = email_verification_tokens.get(request_data.token)
    
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )
    
    # Check expiration
    if datetime.utcnow() > token_data["expires_at"]:
        del email_verification_tokens[request_data.token]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token has expired"
        )
    
    # Update user
    user = db.query(User).filter(User.id == token_data["user_id"]).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.email_verified = True
    db.commit()
    
    # Remove used token
    del email_verification_tokens[request_data.token]
    
    return {"message": "Email verified successfully"}


@router.post("/resend-verification")
async def resend_verification(
    request_data: ResendVerificationRequest,
    db: Session = Depends(get_db)
):
    """
    Resend email verification link.
    
    Args:
        request_data: Email address
        db: Database session
        
    Returns:
        Success message with verification token (for testing)
    """
    user = db.query(User).filter(User.email == request_data.email).first()
    
    if not user:
        # Don't reveal if email exists
        return {
            "message": "If the email exists and is not verified, a verification link has been sent"
        }
    
    if user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already verified"
        )
    
    # Generate new verification token
    verification_token = secrets.token_urlsafe(32)
    email_verification_tokens[verification_token] = {
        "user_id": str(user.id),
        "email": user.email,
        "expires_at": datetime.utcnow() + timedelta(hours=24)
    }
    
    # In production, send verification email here
    
    return {
        "message": "Verification email sent",
        "verification_token": verification_token  # Remove in production
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get current authenticated user information.
    
    Args:
        current_user: Current authenticated user (from dependency)
        
    Returns:
        User information without password
    """
    return current_user

