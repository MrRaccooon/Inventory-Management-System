"""
Shop schemas.
"""
from pydantic import BaseModel
from datetime import datetime


class ShopCreate(BaseModel):
    """Shop creation schema."""
    name: str
    address: str | None = None
    timezone: str = "UTC"
    currency: str = "INR"
    gst_number: str | None = None


class ShopUpdate(BaseModel):
    """Shop update schema."""
    name: str | None = None
    address: str | None = None
    timezone: str | None = None
    currency: str | None = None
    gst_number: str | None = None


class ShopResponse(BaseModel):
    """Shop response schema."""
    id: str
    name: str
    owner_user_id: str | None
    address: str | None
    timezone: str
    currency: str
    gst_number: str | None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ShopListResponse(BaseModel):
    """Shop list response schema."""
    shops: list[ShopResponse]
    total: int
    skip: int
    limit: int

