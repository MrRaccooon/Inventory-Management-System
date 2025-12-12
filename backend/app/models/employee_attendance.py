# backend/app/models/employee_attendance.py
import uuid
from sqlalchemy import Column, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy import TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey

from app.db.base import Base


class EmployeeAttendance(Base):
    __tablename__ = "employee_attendance"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    employee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    shop_id = Column(UUID(as_uuid=True), ForeignKey("shops.id"), nullable=False)
    checkin_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    checkout_at = Column(TIMESTAMP(timezone=True), nullable=True)
    status = Column(Text, nullable=False, server_default="'present'::character varying")
    note = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    employee = relationship("User", back_populates="attendance")
    shop = relationship("Shop", back_populates="employee_attendance")
