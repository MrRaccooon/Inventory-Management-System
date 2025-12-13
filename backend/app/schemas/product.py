"""
Product schemas.
"""
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel
from uuid import UUID


class ProductBase(BaseModel):
    """Base product schema."""
    sku: str
    name: str
    description: Optional[str] = None
    category_id: Optional[UUID] = None
    price_mrp: Decimal
    cost_price: Decimal
    min_stock_threshold: int = 0
    barcode: Optional[str] = None
    reorder_qty: int = 0
    lead_time_days: int = 0
    attributes: dict = {}
    is_active: bool = True


class ProductCreate(ProductBase):
    """Schema for creating a product."""
    initial_stock: int = 0


class ProductUpdate(BaseModel):
    """Schema for updating a product."""
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[UUID] = None
    price_mrp: Optional[Decimal] = None
    cost_price: Optional[Decimal] = None
    min_stock_threshold: Optional[int] = None
    barcode: Optional[str] = None
    reorder_qty: Optional[int] = None
    lead_time_days: Optional[int] = None
    attributes: Optional[dict] = None
    is_active: Optional[bool] = None


class ProductResponse(ProductBase):
    """Product response schema."""
    id: UUID
    shop_id: Optional[UUID]
    current_stock: int
    created_at: str
    updated_at: str
    
    class Config:
        from_attributes = True


class ProductListResponse(BaseModel):
    """Paginated product list response."""
    items: list[ProductResponse]
    total: int
    page: int
    page_size: int

