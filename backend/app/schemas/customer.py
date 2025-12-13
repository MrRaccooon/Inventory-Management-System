"""
Customer management schemas.
"""
from pydantic import BaseModel, EmailStr
from decimal import Decimal
from datetime import datetime


class CustomerCreate(BaseModel):
    """Customer creation schema."""
    name: str
    email: EmailStr | None = None
    phone: str
    address: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    gst_number: str | None = None
    credit_limit: Decimal | None = None
    notes: str | None = None


class CustomerUpdate(BaseModel):
    """Customer update schema."""
    name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    gst_number: str | None = None
    credit_limit: Decimal | None = None
    is_active: bool | None = None
    notes: str | None = None


class CustomerResponse(BaseModel):
    """Customer response schema."""
    id: str
    shop_id: str
    name: str
    email: str | None
    phone: str
    address: str | None
    city: str | None
    state: str | None
    pincode: str | None
    gst_number: str | None
    total_purchases: Decimal
    total_orders: int
    credit_limit: Decimal | None
    outstanding_balance: Decimal
    is_active: bool
    notes: str | None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CustomerListResponse(BaseModel):
    """Customer list response schema."""
    customers: list[CustomerResponse]
    total: int
    skip: int
    limit: int

