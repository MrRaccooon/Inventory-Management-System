"""
Notification management API endpoints.
Handles user notifications.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime
import uuid

from app.db.session import get_db
from app.models.user import User
from app.models.notifications import Notification
from app.utils.auth import get_current_active_user, require_role
from app.schemas.notification import (
    NotificationCreate,
    NotificationResponse,
    NotificationListResponse,
    MarkReadRequest
)

router = APIRouter()


@router.post("", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def create_notification(
    notification_data: NotificationCreate,
    current_user: User = Depends(require_role(["owner", "manager", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Create a new notification.
    Requires owner, manager, or admin role.
    
    Args:
        notification_data: Notification data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Created notification
    """
    if not current_user.shop_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a shop"
        )
    
    new_notification = Notification(
        id=uuid.uuid4(),
        shop_id=current_user.shop_id,
        target_user_id=uuid.UUID(notification_data.target_user_id) if notification_data.target_user_id else None,
        title=notification_data.title,
        message=notification_data.message,
        type=notification_data.type,
        is_read=False
    )
    
    db.add(new_notification)
    db.commit()
    db.refresh(new_notification)
    
    return new_notification


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List all notifications for current user.
    
    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        unread_only: Show only unread notifications
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List of notifications with pagination
    """
    if not current_user.shop_id:
        return NotificationListResponse(
            notifications=[],
            total=0,
            unread_count=0,
            skip=skip,
            limit=limit
        )
    
    # Get notifications for this user or shop-wide notifications
    query = db.query(Notification).filter(
        Notification.shop_id == current_user.shop_id
    ).filter(
        (Notification.target_user_id == current_user.id) | 
        (Notification.target_user_id == None)
    )
    
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    total = query.count()
    unread_count = db.query(Notification).filter(
        Notification.shop_id == current_user.shop_id,
        ((Notification.target_user_id == current_user.id) | 
         (Notification.target_user_id == None)),
        Notification.is_read == False
    ).count()
    
    notifications = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
    
    return NotificationListResponse(
        notifications=notifications,
        total=total,
        unread_count=unread_count,
        skip=skip,
        limit=limit
    )


@router.post("/mark-read")
async def mark_notifications_read(
    request_data: MarkReadRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Mark notifications as read.
    
    Args:
        request_data: List of notification IDs to mark as read
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Success message with count
    """
    if not current_user.shop_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a shop"
        )
    
    notification_uuids = [uuid.UUID(nid) for nid in request_data.notification_ids]
    
    # Update notifications
    updated = db.query(Notification).filter(
        Notification.id.in_(notification_uuids),
        Notification.shop_id == current_user.shop_id,
        ((Notification.target_user_id == current_user.id) | 
         (Notification.target_user_id == None))
    ).update(
        {
            Notification.is_read: True,
            Notification.read_at: datetime.utcnow()
        },
        synchronize_session=False
    )
    
    db.commit()
    
    return {
        "message": f"Marked {updated} notification(s) as read",
        "count": updated
    }


@router.post("/mark-all-read")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Mark all notifications as read for current user.
    
    Args:
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Success message with count
    """
    if not current_user.shop_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a shop"
        )
    
    updated = db.query(Notification).filter(
        Notification.shop_id == current_user.shop_id,
        ((Notification.target_user_id == current_user.id) | 
         (Notification.target_user_id == None)),
        Notification.is_read == False
    ).update(
        {
            Notification.is_read: True,
            Notification.read_at: datetime.utcnow()
        },
        synchronize_session=False
    )
    
    db.commit()
    
    return {
        "message": f"Marked all {updated} notification(s) as read",
        "count": updated
    }


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Delete a notification.
    
    Args:
        notification_id: Notification ID
        current_user: Current authenticated user
        db: Session session
    """
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.shop_id == current_user.shop_id,
        ((Notification.target_user_id == current_user.id) | 
         (Notification.target_user_id == None))
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    db.delete(notification)
    db.commit()
    
    return None

