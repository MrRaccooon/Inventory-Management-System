"""
Category schemas.
"""
from pydantic import BaseModel
from datetime import datetime


class CategoryCreate(BaseModel):
    """Category creation schema."""
    name: str
    description: str | None = None


class CategoryUpdate(BaseModel):
    """Category update schema."""
    name: str | None = None
    description: str | None = None


class CategoryResponse(BaseModel):
    """Category response schema."""
    id: str
    shop_id: str
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CategoryListResponse(BaseModel):
    """Category list response schema."""
    categories: list[CategoryResponse]
    total: int
    skip: int
    limit: int

