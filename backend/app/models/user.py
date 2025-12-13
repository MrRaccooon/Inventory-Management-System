# backend/app/models/user.py
import uuid
from sqlalchemy import Column, Text, Boolean, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy import TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy import Enum as SAEnum

from app.db.base import Base

user_role = SAEnum('owner', 'manager', 'staff', 'auditor', 'admin', name="user_role")


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    shop_id = Column(UUID(as_uuid=True), nullable=True)
    name = Column(Text, nullable=False)
    email = Column(Text, nullable=False)
    password_hash = Column(Text, nullable=False)
    role = Column(user_role, nullable=False, server_default="'staff'::user_role")
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    email_verified = Column(Boolean, nullable=False, server_default=text("false"))
    two_factor_enabled = Column(Boolean, nullable=False, server_default=text("false"))
    two_factor_secret = Column(Text, nullable=True)
    last_login = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    # relationships
    shop = relationship("Shop", back_populates="users")
    sales = relationship("Sale", back_populates="created_by_user")
    stock_movements = relationship("StockMovement", back_populates="created_by_user")
    attendance = relationship("EmployeeAttendance", back_populates="employee")
    notifications_target = relationship("Notification", back_populates="target_user")
    invoices_issued = relationship("Invoice", back_populates="issued_by_user")
    audit_logs = relationship("AuditLog", back_populates="user")
