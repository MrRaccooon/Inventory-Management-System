# backend/app/models/products.py
import uuid
from sqlalchemy import Column, Text, Integer, Numeric, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy import TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey

from app.db.base import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    shop_id = Column(UUID(as_uuid=True), ForeignKey("shops.id"), nullable=True)
    sku = Column(Text, nullable=False)
    name = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True)
    price_mrp = Column(Numeric(14, 2), nullable=False, server_default=text("0.00"))
    cost_price = Column(Numeric, nullable=False, server_default=text("0.00"))
    current_stock = Column(Integer, nullable=False, server_default=text("0"))
    min_stock_threshold = Column(Integer, nullable=False, server_default=text("0"))
    barcode = Column(Text, nullable=True)
    reorder_qty = Column(Integer, nullable=True, server_default=text("0"))
    lead_time_days = Column(Integer, nullable=True, server_default=text("0"))
    attributes = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    # relationships
    shop = relationship("Shop", back_populates="products")
    category = relationship("Category", back_populates="products")
    sale_items = relationship("SaleItem", back_populates="product", cascade="all, delete-orphan")
    stock_movements = relationship("StockMovement", back_populates="product", cascade="all, delete-orphan")
    forecasts = relationship("Forecast", back_populates="product", cascade="all, delete-orphan")
