"""
Employee management schemas.
"""
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class EmployeeCreate(BaseModel):
    """Schema for creating an employee."""
    name: str
    email: str
    password: str
    role: str = "staff"  # owner, manager, staff, auditor, admin


class EmployeeUpdate(BaseModel):
    """Schema for updating an employee."""
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class EmployeeResponse(BaseModel):
    """Employee response schema."""
    id: UUID
    shop_id: Optional[UUID]
    name: str
    email: str
    role: str
    is_active: bool
    last_login: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


class AttendanceCreate(BaseModel):
    """Schema for creating attendance record."""
    employee_id: UUID
    checkin_at: Optional[datetime] = None
    note: Optional[str] = None


class AttendanceUpdate(BaseModel):
    """Schema for updating attendance (checkout)."""
    checkout_at: Optional[datetime] = None
    status: Optional[str] = None
    note: Optional[str] = None


class AttendanceResponse(BaseModel):
    """Attendance response schema."""
    id: UUID
    employee_id: UUID
    employee_name: Optional[str] = None
    shop_id: UUID
    checkin_at: datetime
    checkout_at: Optional[datetime]
    status: str
    note: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class EmployeePerformance(BaseModel):
    """Employee performance metrics."""
    employee_id: UUID
    employee_name: str
    total_sales: Decimal
    total_profit: Decimal
    order_count: int
    avg_order_value: Decimal
    errors_count: int
    last_login: Optional[datetime]


class EmployeeListResponse(BaseModel):
    """Paginated employee list response."""
    items: List[EmployeeResponse]
    total: int
    page: int
    page_size: int

