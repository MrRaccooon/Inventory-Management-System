# backend/app/models/notifications.py
import uuid
from sqlalchemy import Column, Text, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy import TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey, Enum as SAEnum

from app.db.base import Base

notification_status = SAEnum('unread','read','dismissed', name="notification_status")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    shop_id = Column(UUID(as_uuid=True), ForeignKey("shops.id"), nullable=False)
    type = Column(Text, nullable=False)
    target_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    payload = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    status = Column(notification_status, nullable=False, server_default="'unread'::notification_status")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    shop = relationship("Shop", back_populates="notifications")
    target_user = relationship("User", back_populates="notifications_target")
