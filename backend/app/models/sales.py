# backend/app/models/sales.py
import uuid
from sqlalchemy import Column, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy import TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey
from sqlalchemy import Enum as SAEnum

from app.db.base import Base

payment_type = SAEnum('cash', 'card', 'upi', 'credit', 'other', name="payment_type")
invoice_status = SAEnum('draft', 'paid', 'pending', 'void', 'refunded', name="invoice_status")


class Sale(Base):
    __tablename__ = "sales"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    shop_id = Column(UUID(as_uuid=True), ForeignKey("shops.id"), nullable=False)
    invoice_no = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    total_amount = Column(Numeric(14,2), nullable=False, server_default=text("0.00"))
    total_cost = Column(Numeric(14,2), nullable=False, server_default=text("0.00"))
    profit = Column(Numeric(14,2), nullable=False, server_default=text("0.00"))
    payment_type = Column(payment_type, nullable=False, server_default="'cash'::payment_type")
    customer_info = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(invoice_status, nullable=False, server_default="'paid'::invoice_status")
    gst_breakdown = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    rounding_adjustment = Column(Numeric, nullable=False, server_default=text("0.00"))
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    # relationships
    shop = relationship("Shop", back_populates="sales")
    created_by_user = relationship("User", back_populates="sales")
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="sale", cascade="all, delete-orphan")
