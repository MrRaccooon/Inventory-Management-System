"""
Notification schemas.
"""
from pydantic import BaseModel
from datetime import datetime


class NotificationCreate(BaseModel):
    """Notification creation schema."""
    title: str
    message: str
    type: str  # info, warning, error, success
    target_user_id: str | None = None  # Specific user or None for all


class NotificationResponse(BaseModel):
    """Notification response schema."""
    id: str
    shop_id: str
    target_user_id: str | None
    title: str
    message: str
    type: str
    is_read: bool
    read_at: datetime | None
    created_at: datetime
    
    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    """Notification list response schema."""
    notifications: list[NotificationResponse]
    total: int
    unread_count: int
    skip: int
    limit: int


class MarkReadRequest(BaseModel):
    """Mark notification as read request."""
    notification_ids: list[str]

