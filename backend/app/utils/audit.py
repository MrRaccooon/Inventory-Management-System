"""
Audit logging utilities.
Records all important actions for compliance and debugging.
"""
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from uuid import UUID

from app.models.audit_logs import AuditLog
from app.models.user import User


def log_action(
    db: Session,
    action: str,
    user_id: Optional[UUID] = None,
    shop_id: Optional[UUID] = None,
    object_type: Optional[str] = None,
    object_id: Optional[UUID] = None,
    payload: Optional[Dict[str, Any]] = None
) -> AuditLog:
    """
    Log an action to the audit log.
    
    Args:
        db: Database session
        action: Action name (e.g., 'create_sale', 'update_product', 'delete_user')
        user_id: User who performed the action
        shop_id: Shop context
        object_type: Type of object affected (e.g., 'sale', 'product')
        object_id: ID of object affected
        payload: Additional data as JSON
        
    Returns:
        Created AuditLog record
    """
    audit_log = AuditLog(
        shop_id=shop_id,
        user_id=user_id,
        action=action,
        object_type=object_type,
        object_id=object_id,
        payload=payload or {}
    )
    
    db.add(audit_log)
    return audit_log

