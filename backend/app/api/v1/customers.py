"""
Customer management API endpoints.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime
import uuid

from app.db.session import get_db
from app.models.user import User
from app.models.customer import Customer
from app.utils.auth import get_current_active_user, require_role
from app.schemas.customer import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerListResponse
)

router = APIRouter()


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    customer_data: CustomerCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create a new customer.
    
    Args:
        customer_data: Customer data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Created customer
    """
    if not current_user.shop_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a shop"
        )
    
    # Check for duplicate phone in same shop
    existing = db.query(Customer).filter(
        Customer.shop_id == current_user.shop_id,
        Customer.phone == customer_data.phone
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Customer with this phone number already exists"
        )
    
    new_customer = Customer(
        id=uuid.uuid4(),
        shop_id=current_user.shop_id,
        **customer_data.model_dump()
    )
    
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    
    return new_customer


@router.get("", response_model=CustomerListResponse)
async def list_customers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: str | None = Query(None),
    is_active: bool | None = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List all customers for the current shop.
    
    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        search: Search by name, phone, or email
        is_active: Filter by active status
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List of customers
    """
    if not current_user.shop_id:
        return CustomerListResponse(customers=[], total=0, skip=skip, limit=limit)
    
    query = db.query(Customer).filter(Customer.shop_id == current_user.shop_id)
    
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Customer.name.ilike(search_pattern)) |
            (Customer.phone.ilike(search_pattern)) |
            (Customer.email.ilike(search_pattern))
        )
    
    if is_active is not None:
        query = query.filter(Customer.is_active == is_active)
    
    total = query.count()
    customers = query.order_by(Customer.name).offset(skip).limit(limit).all()
    
    return CustomerListResponse(
        customers=customers,
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific customer by ID.
    
    Args:
        customer_id: Customer UUID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Customer details
    """
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.shop_id == current_user.shop_id
    ).first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    return customer


@router.patch("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: UUID,
    customer_data: CustomerUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update a customer.
    
    Args:
        customer_id: Customer UUID
        customer_data: Updated customer data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Updated customer
    """
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.shop_id == current_user.shop_id
    ).first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    # Update fields
    update_data = customer_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(customer, field, value)
    
    customer.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(customer)
    
    return customer


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: UUID,
    current_user: User = Depends(require_role(["owner", "manager", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Delete a customer (soft delete by setting is_active=False).
    Only owners, managers, and admins can delete customers.
    
    Args:
        customer_id: Customer UUID
        current_user: Current authenticated user
        db: Database session
    """
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.shop_id == current_user.shop_id
    ).first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    # Soft delete
    customer.is_active = False
    customer.updated_at = datetime.utcnow()
    db.commit()
    
    return None


@router.get("/{customer_id}/purchase-history")
async def get_customer_purchase_history(
    customer_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get purchase history for a customer.
    
    Args:
        customer_id: Customer UUID
        skip: Number of records to skip
        limit: Maximum number of records to return
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Customer's purchase history
    """
    from app.models.sales import Sale
    
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.shop_id == current_user.shop_id
    ).first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    # Find sales with this customer's phone in customer_info
    sales = db.query(Sale).filter(
        Sale.shop_id == current_user.shop_id
    ).all()
    
    # Filter by customer phone (stored in customer_info JSON)
    customer_sales = [
        s for s in sales 
        if s.customer_info.get('phone') == customer.phone
    ]
    
    # Apply pagination
    total = len(customer_sales)
    customer_sales = customer_sales[skip:skip+limit]
    
    return {
        "customer_id": str(customer_id),
        "customer_name": customer.name,
        "total_purchases": float(customer.total_purchases),
        "total_orders": len(customer_sales),
        "purchases": [
            {
                "sale_id": str(s.id),
                "invoice_no": s.invoice_no,
                "date": s.created_at.isoformat(),
                "total_amount": float(s.total_amount),
                "payment_type": s.payment_type,
                "status": s.status
            }
            for s in customer_sales
        ],
        "skip": skip,
        "limit": limit,
        "total": total
    }

