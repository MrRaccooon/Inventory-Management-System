# backend/app/models/shop.py
import uuid
from sqlalchemy import Column, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy import TIMESTAMP
from sqlalchemy.orm import relationship

from app.db.base import Base


class Shop(Base):
    __tablename__ = "shops"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    name = Column(Text, nullable=False)
    owner_user_id = Column(UUID(as_uuid=True), nullable=True)
    address = Column(Text, nullable=True)
    timezone = Column(Text, nullable=False, server_default="'UTC'::text")
    currency = Column(Text, nullable=False, server_default="'INR'::text")
    gst_number = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    # relationships
    users = relationship("User", back_populates="shop", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="shop", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="shop", cascade="all, delete-orphan")
    sales = relationship("Sale", back_populates="shop", cascade="all, delete-orphan")
    stock_movements = relationship("StockMovement", back_populates="shop", cascade="all, delete-orphan")
    forecasts = relationship("Forecast", back_populates="shop", cascade="all, delete-orphan")
    ai_insights = relationship("AIInsightsCache", back_populates="shop", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="shop", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="shop", cascade="all, delete-orphan")
    employee_attendance = relationship("EmployeeAttendance", back_populates="shop", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="shop", cascade="all, delete-orphan")
