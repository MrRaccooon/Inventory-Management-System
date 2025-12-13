# backend/app/models/supplier.py
import uuid
from sqlalchemy import Column, Text, Boolean, text, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy import TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey

from app.db.base import Base


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    shop_id = Column(UUID(as_uuid=True), ForeignKey("shops.id"), nullable=False)
    name = Column(Text, nullable=False)
    company_name = Column(Text, nullable=True)
    email = Column(Text, nullable=True)
    phone = Column(Text, nullable=False)
    address = Column(Text, nullable=True)
    city = Column(Text, nullable=True)
    state = Column(Text, nullable=True)
    pincode = Column(Text, nullable=True)
    gst_number = Column(Text, nullable=True)
    pan_number = Column(Text, nullable=True)
    
    # Business fields
    total_purchases_from = Column(Numeric(14,2), nullable=False, server_default=text("0.00"))
    total_orders = Column(Numeric, nullable=False, server_default=text("0"))
    credit_limit = Column(Numeric(14,2), nullable=True)
    outstanding_payable = Column(Numeric(14,2), nullable=False, server_default=text("0.00"))
    payment_terms = Column(Text, nullable=True)  # e.g., "Net 30", "Net 60"
    
    # Status
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    notes = Column(Text, nullable=True)
    meta_data = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    
    # Timestamps
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    shop = relationship("Shop", backref="suppliers")

