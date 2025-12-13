# backend/app/models/stock_movement.py
import uuid
from sqlalchemy import Column, Integer, Text, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy import TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey
from sqlalchemy import Enum as SAEnum

from app.db.base import Base

stock_movement_reason = SAEnum('sale','purchase','adjustment','return','correction','transfer', name="stock_movement_reason")


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    shop_id = Column(UUID(as_uuid=True), ForeignKey("shops.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    change_qty = Column(Integer, nullable=False)
    reason = Column(stock_movement_reason, nullable=False)
    reference_type = Column(Text, nullable=True)
    reference_id = Column(UUID(as_uuid=True), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    meta_data = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))  # Renamed from 'metadata' (SQLAlchemy reserved)

    # relationships
    product = relationship("Product", back_populates="stock_movements")
    shop = relationship("Shop", back_populates="stock_movements")
    created_by_user = relationship("User", back_populates="stock_movements")
