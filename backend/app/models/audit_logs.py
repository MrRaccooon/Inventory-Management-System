# backend/app/models/audit_logs.py
import uuid
from sqlalchemy import Column, Text, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy import TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey

from app.db.base import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    shop_id = Column(UUID(as_uuid=True), ForeignKey("shops.id"), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action = Column(Text, nullable=False)
    object_type = Column(Text, nullable=True)
    object_id = Column(UUID(as_uuid=True), nullable=True)
    payload = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    shop = relationship("Shop", back_populates="audit_logs")
    user = relationship("User", back_populates="audit_logs")
