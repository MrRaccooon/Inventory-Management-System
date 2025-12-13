# backend/app/models/customer.py
import uuid
from sqlalchemy import Column, Text, Boolean, text, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy import TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey

from app.db.base import Base


class Customer(Base):
    __tablename__ = "customers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    shop_id = Column(UUID(as_uuid=True), ForeignKey("shops.id"), nullable=False)
    name = Column(Text, nullable=False)
    email = Column(Text, nullable=True)
    phone = Column(Text, nullable=False)
    address = Column(Text, nullable=True)
    city = Column(Text, nullable=True)
    state = Column(Text, nullable=True)
    pincode = Column(Text, nullable=True)
    gst_number = Column(Text, nullable=True)
    
    # Business fields
    total_purchases = Column(Numeric(14,2), nullable=False, server_default=text("0.00"))
    total_orders = Column(Numeric, nullable=False, server_default=text("0"))
    credit_limit = Column(Numeric(14,2), nullable=True)
    outstanding_balance = Column(Numeric(14,2), nullable=False, server_default=text("0.00"))
    
    # Status
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    notes = Column(Text, nullable=True)
    meta_data = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    
    # Timestamps
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    shop = relationship("Shop", backref="customers")

