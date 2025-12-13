"""
Shop management API endpoints.
Handles shop CRUD operations.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime
import uuid

from app.db.session import get_db
from app.models.user import User
from app.models.shop import Shop
from app.utils.auth import get_current_active_user, require_role
from app.schemas.shop import (
    ShopCreate,
    ShopUpdate,
    ShopResponse,
    ShopListResponse
)

router = APIRouter()


@router.post("", response_model=ShopResponse, status_code=status.HTTP_201_CREATED)
async def create_shop(
    shop_data: ShopCreate,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Create a new shop.
    Requires admin role.
    
    Args:
        shop_data: Shop creation data
        current_user: Current authenticated user (with required role)
        db: Database session
        
    Returns:
        Created shop
    """
    new_shop = Shop(
        id=uuid.uuid4(),
        name=shop_data.name,
        address=shop_data.address,
        timezone=shop_data.timezone,
        currency=shop_data.currency,
        gst_number=shop_data.gst_number,
        owner_user_id=None  # Can be set later
    )
    
    db.add(new_shop)
    db.commit()
    db.refresh(new_shop)
    
    return new_shop


@router.get("", response_model=ShopListResponse)
async def list_shops(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List all shops.
    Admin sees all shops, others see only their shop.
    
    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        search: Search in shop name
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List of shops with pagination
    """
    query = db.query(Shop)
    
    # Non-admin users can only see their own shop
    if current_user.role != 'admin':
        if not current_user.shop_id:
            return ShopListResponse(shops=[], total=0, skip=skip, limit=limit)
        query = query.filter(Shop.id == current_user.shop_id)
    
    # Search filter
    if search:
        query = query.filter(Shop.name.ilike(f"%{search}%"))
    
    total = query.count()
    shops = query.offset(skip).limit(limit).all()
    
    return ShopListResponse(
        shops=shops,
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{shop_id}", response_model=ShopResponse)
async def get_shop(
    shop_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get shop details.
    
    Args:
        shop_id: Shop ID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Shop details
    """
    shop = db.query(Shop).filter(Shop.id == shop_id).first()
    
    if not shop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shop not found"
        )
    
    # Check permissions
    if current_user.role != 'admin' and current_user.shop_id != shop_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this shop"
        )
    
    return shop


@router.patch("/{shop_id}", response_model=ShopResponse)
async def update_shop(
    shop_id: UUID,
    shop_data: ShopUpdate,
    current_user: User = Depends(require_role(["owner", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Update shop details.
    Requires owner or admin role.
    
    Args:
        shop_id: Shop ID
        shop_data: Shop update data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Updated shop
    """
    shop = db.query(Shop).filter(Shop.id == shop_id).first()
    
    if not shop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shop not found"
        )
    
    # Check permissions
    if current_user.role != 'admin' and current_user.shop_id != shop_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this shop"
        )
    
    # Update fields
    if shop_data.name is not None:
        shop.name = shop_data.name
    if shop_data.address is not None:
        shop.address = shop_data.address
    if shop_data.timezone is not None:
        shop.timezone = shop_data.timezone
    if shop_data.currency is not None:
        shop.currency = shop_data.currency
    if shop_data.gst_number is not None:
        shop.gst_number = shop_data.gst_number
    
    shop.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(shop)
    
    return shop


@router.delete("/{shop_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shop(
    shop_id: UUID,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Delete a shop.
    Requires admin role.
    Warning: This will cascade delete all related data!
    
    Args:
        shop_id: Shop ID
        current_user: Current authenticated user
        db: Database session
    """
    shop = db.query(Shop).filter(Shop.id == shop_id).first()
    
    if not shop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shop not found"
        )
    
    db.delete(shop)
    db.commit()
    
    return None

