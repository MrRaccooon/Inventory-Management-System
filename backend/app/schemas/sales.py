"""
Sales and invoice schemas.
"""
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class SaleItemCreate(BaseModel):
    """Schema for creating a sale item."""
    product_id: UUID
    quantity: int
    unit_price: Decimal
    discount: Decimal = Decimal("0")
    gst_rate: float = 18.0


class SaleItemResponse(BaseModel):
    """Sale item response schema."""
    id: UUID
    product_id: UUID
    product_name: Optional[str] = None
    quantity: int
    unit_price: Decimal
    unit_cost: Decimal
    discount: Decimal
    tax_breakdown: dict
    line_total: Decimal
    
    class Config:
        from_attributes = True


class SaleCreate(BaseModel):
    """Schema for creating a sale."""
    items: List[SaleItemCreate]
    payment_type: str = "cash"  # cash, card, upi, credit, other
    customer_info: dict = {}
    notes: Optional[str] = None
    gst_rate: float = 18.0


class SaleUpdate(BaseModel):
    """Schema for updating a sale."""
    payment_type: Optional[str] = None
    customer_info: Optional[dict] = None
    notes: Optional[str] = None
    status: Optional[str] = None  # draft, paid, pending, void, refunded


class SaleResponse(BaseModel):
    """Sale response schema."""
    id: UUID
    shop_id: UUID
    invoice_no: str
    created_at: datetime
    total_amount: Decimal
    total_cost: Decimal
    profit: Decimal
    payment_type: str
    customer_info: dict
    created_by: Optional[UUID]
    notes: Optional[str]
    status: str
    gst_breakdown: dict
    rounding_adjustment: Decimal
    updated_at: datetime
    items: List[SaleItemResponse] = []
    
    class Config:
        from_attributes = True


class SaleListResponse(BaseModel):
    """Paginated sale list response."""
    items: List[SaleResponse]
    total: int
    page: int
    page_size: int

