"""
Category management API endpoints.
Handles product category CRUD operations.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime
import uuid

from app.db.session import get_db
from app.models.user import User
from app.models.categories import Category
from app.utils.auth import get_current_active_user, require_role
from app.schemas.category import (
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse,
    CategoryListResponse
)

router = APIRouter()


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_data: CategoryCreate,
    current_user: User = Depends(require_role(["owner", "manager", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Create a new category.
    Requires owner, manager, or admin role.
    
    Args:
        category_data: Category creation data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Created category
    """
    if not current_user.shop_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a shop"
        )
    
    # Check if category name already exists in this shop
    existing = db.query(Category).filter(
        Category.shop_id == current_user.shop_id,
        Category.name == category_data.name
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this name already exists"
        )
    
    new_category = Category(
        id=uuid.uuid4(),
        shop_id=current_user.shop_id,
        name=category_data.name,
        description=category_data.description
    )
    
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    
    return new_category


@router.get("", response_model=CategoryListResponse)
async def list_categories(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List all categories for the user's shop.
    
    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        search: Search in category name
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List of categories with pagination
    """
    if not current_user.shop_id:
        return CategoryListResponse(categories=[], total=0, skip=skip, limit=limit)
    
    query = db.query(Category).filter(Category.shop_id == current_user.shop_id)
    
    # Search filter
    if search:
        query = query.filter(Category.name.ilike(f"%{search}%"))
    
    total = query.count()
    categories = query.offset(skip).limit(limit).all()
    
    return CategoryListResponse(
        categories=categories,
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get category details.
    
    Args:
        category_id: Category ID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Category details
    """
    category = db.query(Category).filter(Category.id == category_id).first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Check if category belongs to user's shop
    if category.shop_id != current_user.shop_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this category"
        )
    
    return category


@router.patch("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: UUID,
    category_data: CategoryUpdate,
    current_user: User = Depends(require_role(["owner", "manager", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Update category details.
    Requires owner, manager, or admin role.
    
    Args:
        category_id: Category ID
        category_data: Category update data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Updated category
    """
    category = db.query(Category).filter(Category.id == category_id).first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Check if category belongs to user's shop
    if category.shop_id != current_user.shop_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this category"
        )
    
    # Check for duplicate name if name is being changed
    if category_data.name is not None and category_data.name != category.name:
        existing = db.query(Category).filter(
            Category.shop_id == current_user.shop_id,
            Category.name == category_data.name,
            Category.id != category_id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category with this name already exists"
            )
        
        category.name = category_data.name
    
    if category_data.description is not None:
        category.description = category_data.description
    
    category.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(category)
    
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: UUID,
    current_user: User = Depends(require_role(["owner", "manager", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Delete a category.
    Requires owner, manager, or admin role.
    
    Args:
        category_id: Category ID
        current_user: Current authenticated user
        db: Database session
    """
    category = db.query(Category).filter(Category.id == category_id).first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Check if category belongs to user's shop
    if category.shop_id != current_user.shop_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this category"
        )
    
    db.delete(category)
    db.commit()
    
    return None

