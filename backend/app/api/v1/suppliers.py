"""
Supplier management API endpoints.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime
import uuid

from app.db.session import get_db
from app.models.user import User
from app.models.supplier import Supplier
from app.utils.auth import get_current_active_user, require_role
from app.schemas.supplier import (
    SupplierCreate,
    SupplierUpdate,
    SupplierResponse,
    SupplierListResponse
)

router = APIRouter()


@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    supplier_data: SupplierCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create a new supplier.
    
    Args:
        supplier_data: Supplier data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Created supplier
    """
    if not current_user.shop_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a shop"
        )
    
    # Check for duplicate phone in same shop
    existing = db.query(Supplier).filter(
        Supplier.shop_id == current_user.shop_id,
        Supplier.phone == supplier_data.phone
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Supplier with this phone number already exists"
        )
    
    new_supplier = Supplier(
        id=uuid.uuid4(),
        shop_id=current_user.shop_id,
        **supplier_data.model_dump()
    )
    
    db.add(new_supplier)
    db.commit()
    db.refresh(new_supplier)
    
    return new_supplier


@router.get("", response_model=SupplierListResponse)
async def list_suppliers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: str | None = Query(None),
    is_active: bool | None = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List all suppliers for the current shop.
    
    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        search: Search by name, company, phone, or email
        is_active: Filter by active status
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List of suppliers
    """
    if not current_user.shop_id:
        return SupplierListResponse(suppliers=[], total=0, skip=skip, limit=limit)
    
    query = db.query(Supplier).filter(Supplier.shop_id == current_user.shop_id)
    
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Supplier.name.ilike(search_pattern)) |
            (Supplier.company_name.ilike(search_pattern)) |
            (Supplier.phone.ilike(search_pattern)) |
            (Supplier.email.ilike(search_pattern))
        )
    
    if is_active is not None:
        query = query.filter(Supplier.is_active == is_active)
    
    total = query.count()
    suppliers = query.order_by(Supplier.name).offset(skip).limit(limit).all()
    
    return SupplierListResponse(
        suppliers=suppliers,
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{supplier_id}", response_model=SupplierResponse)
async def get_supplier(
    supplier_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific supplier by ID.
    
    Args:
        supplier_id: Supplier UUID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Supplier details
    """
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id,
        Supplier.shop_id == current_user.shop_id
    ).first()
    
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    return supplier


@router.patch("/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: UUID,
    supplier_data: SupplierUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update a supplier.
    
    Args:
        supplier_id: Supplier UUID
        supplier_data: Updated supplier data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Updated supplier
    """
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id,
        Supplier.shop_id == current_user.shop_id
    ).first()
    
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    # Update fields
    update_data = supplier_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(supplier, field, value)
    
    supplier.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(supplier)
    
    return supplier


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_supplier(
    supplier_id: UUID,
    current_user: User = Depends(require_role(["owner", "manager", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Delete a supplier (soft delete by setting is_active=False).
    Only owners, managers, and admins can delete suppliers.
    
    Args:
        supplier_id: Supplier UUID
        current_user: Current authenticated user
        db: Database session
    """
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id,
        Supplier.shop_id == current_user.shop_id
    ).first()
    
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    # Soft delete
    supplier.is_active = False
    supplier.updated_at = datetime.utcnow()
    db.commit()
    
    return None

