# backend/app/models/refresh_token.py
import uuid
from sqlalchemy import Column, Text, Boolean, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy import TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey

from app.db.base import Base


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    token = Column(Text, nullable=False, unique=True)
    is_revoked = Column(Boolean, nullable=False, server_default=text("false"))
    expires_at = Column(TIMESTAMP(timezone=True), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    
    # Metadata
    device_info = Column(Text, nullable=True)  # User agent, device info
    ip_address = Column(Text, nullable=True)
    
    # Relationship
    user = relationship("User", backref="refresh_tokens")

