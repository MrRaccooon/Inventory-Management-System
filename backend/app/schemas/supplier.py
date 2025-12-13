"""
Supplier management schemas.
"""
from pydantic import BaseModel, EmailStr
from decimal import Decimal
from datetime import datetime


class SupplierCreate(BaseModel):
    """Supplier creation schema."""
    name: str
    company_name: str | None = None
    email: EmailStr | None = None
    phone: str
    address: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    gst_number: str | None = None
    pan_number: str | None = None
    payment_terms: str | None = None
    notes: str | None = None


class SupplierUpdate(BaseModel):
    """Supplier update schema."""
    name: str | None = None
    company_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    gst_number: str | None = None
    pan_number: str | None = None
    payment_terms: str | None = None
    is_active: bool | None = None
    notes: str | None = None


class SupplierResponse(BaseModel):
    """Supplier response schema."""
    id: str
    shop_id: str
    name: str
    company_name: str | None
    email: str | None
    phone: str
    address: str | None
    city: str | None
    state: str | None
    pincode: str | None
    gst_number: str | None
    pan_number: str | None
    total_purchases_from: Decimal
    total_orders: int
    outstanding_payable: Decimal
    payment_terms: str | None
    is_active: bool
    notes: str | None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class SupplierListResponse(BaseModel):
    """Supplier list response schema."""
    suppliers: list[SupplierResponse]
    total: int
    skip: int
    limit: int

