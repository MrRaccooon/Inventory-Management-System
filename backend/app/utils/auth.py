"""
Authentication and authorization utilities.
Handles JWT token generation, password hashing, and role-based access control.
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import secrets
import uuid

from app.config import settings
from app.db.session import get_db
from app.models.user import User

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme for token extraction
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password.
    
    Args:
        plain_password: The plain text password
        hashed_password: The hashed password from database
        
    Returns:
        True if passwords match, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt.
    
    Args:
        password: Plain text password
        
    Returns:
        Hashed password string
    """
    return pwd_context.hash(password)


def create_refresh_token(user_id: str, device_info: str = None, ip_address: str = None) -> dict:
    """
    Create a refresh token for a user.
    
    Args:
        user_id: User UUID
        device_info: Device/user agent information
        ip_address: Client IP address
        
    Returns:
        Dictionary with token and expiry info
    """
    from app.models.refresh_token import RefreshToken
    from app.db.session import SessionLocal
    
    # Generate secure random token
    token = secrets.token_urlsafe(64)
    expires_at = datetime.utcnow() + timedelta(days=30)  # 30 days
    
    # Store in database
    db = SessionLocal()
    try:
        refresh_token = RefreshToken(
            id=uuid.uuid4(),
            user_id=uuid.UUID(user_id),
            token=token,
            expires_at=expires_at,
            device_info=device_info,
            ip_address=ip_address
        )
        db.add(refresh_token)
        db.commit()
        db.refresh(refresh_token)
        
        return {
            "refresh_token": token,
            "expires_at": expires_at.isoformat(),
            "token_id": str(refresh_token.id)
        }
    finally:
        db.close()


def verify_refresh_token(token: str) -> dict | None:
    """
    Verify a refresh token and return user info if valid.
    
    Args:
        token: Refresh token string
        
    Returns:
        User info dict or None if invalid
    """
    from app.models.refresh_token import RefreshToken
    from app.db.session import SessionLocal
    
    db = SessionLocal()
    try:
        refresh_token = db.query(RefreshToken).filter(
            RefreshToken.token == token,
            RefreshToken.is_revoked == False,
            RefreshToken.expires_at > datetime.utcnow()
        ).first()
        
        if not refresh_token:
            return None
        
        return {
            "user_id": str(refresh_token.user_id),
            "token_id": str(refresh_token.id)
        }
    finally:
        db.close()


def revoke_refresh_token(token: str) -> bool:
    """
    Revoke a refresh token.
    
    Args:
        token: Refresh token to revoke
        
    Returns:
        True if revoked, False if not found
    """
    from app.models.refresh_token import RefreshToken
    from app.db.session import SessionLocal
    
    db = SessionLocal()
    try:
        refresh_token = db.query(RefreshToken).filter(
            RefreshToken.token == token
        ).first()
        
        if not refresh_token:
            return False
        
        refresh_token.is_revoked = True
        db.commit()
        return True
    finally:
        db.close()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Dictionary containing user data (e.g., user_id, email)
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get the current authenticated user from JWT token.
    
    Args:
        token: JWT token from request header
        db: Database session
        
    Returns:
        User object
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency to ensure the current user is active.
    
    Args:
        current_user: Current user from get_current_user
        
    Returns:
        Active user object
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    return current_user


def require_role(allowed_roles: list[str]):
    """
    Dependency factory to check if user has required role.
    
    Args:
        allowed_roles: List of allowed role names (e.g., ['owner', 'manager'])
        
    Returns:
        Dependency function that checks user role
    """
    async def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role.value not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}"
            )
        return current_user
    
    return role_checker

