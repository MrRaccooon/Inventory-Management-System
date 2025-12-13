# backend/app/models/sale_item.py
import uuid
from sqlalchemy import Column, Integer, Numeric, CheckConstraint, Text, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey
from sqlalchemy import TIMESTAMP
from sqlalchemy.sql import func

from app.db.base import Base


class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    sale_id = Column(UUID(as_uuid=True), ForeignKey("sales.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(14,2), nullable=False, server_default=text("0.00"))
    unit_cost = Column(Numeric(14,2), nullable=False, server_default=text("0.00"))
    discount = Column(Numeric, nullable=False, server_default=text("0.00"))
    tax_breakdown = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    line_total = Column(Numeric, nullable=False, server_default=text("0.00"))

    __table_args__ = (
        CheckConstraint('quantity > 0', name='sale_items_quantity_positive'),
    )

    # relationships
    sale = relationship("Sale", back_populates="items")
    product = relationship("Product", back_populates="sale_items")
