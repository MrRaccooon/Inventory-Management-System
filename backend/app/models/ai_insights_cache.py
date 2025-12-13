# backend/app/models/ai_insights_cache.py
import uuid
from sqlalchemy import Column, Text, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy import TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey

from app.db.base import Base


class AIInsightsCache(Base):
    __tablename__ = "ai_insights_cache"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    shop_id = Column(UUID(as_uuid=True), ForeignKey("shops.id"), nullable=False)
    insight_key = Column(Text, nullable=False)
    payload = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    model_version = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(TIMESTAMP(timezone=True), nullable=True)

    shop = relationship("Shop", back_populates="ai_insights")
