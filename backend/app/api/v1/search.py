"""
Advanced search API endpoints.
Unified search across multiple entities.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from datetime import datetime
from decimal import Decimal

from app.db.session import get_db
from app.models.user import User
from app.models.product import Product
from app.models.customer import Customer
from app.models.supplier import Supplier
from app.models.sales import Sale
from app.utils.auth import get_current_active_user

router = APIRouter()


@router.get("/global")
async def global_search(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Global search across products, customers, suppliers, and sales.
    
    Args:
        q: Search query string
        limit: Maximum results per category
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Search results grouped by entity type
    """
    if not current_user.shop_id:
        return {
            "query": q,
            "results": {
                "products": [],
                "customers": [],
                "suppliers": [],
                "sales": []
            },
            "total": 0
        }
    
    search_pattern = f"%{q}%"
    
    # Search products
    products = db.query(Product).filter(
        Product.shop_id == current_user.shop_id,
        (Product.name.ilike(search_pattern)) |
        (Product.sku.ilike(search_pattern)) |
        (Product.description.ilike(search_pattern))
    ).limit(limit).all()
    
    # Search customers
    customers = db.query(Customer).filter(
        Customer.shop_id == current_user.shop_id,
        (Customer.name.ilike(search_pattern)) |
        (Customer.phone.ilike(search_pattern)) |
        (Customer.email.ilike(search_pattern))
    ).limit(limit).all()
    
    # Search suppliers
    suppliers = db.query(Supplier).filter(
        Supplier.shop_id == current_user.shop_id,
        (Supplier.name.ilike(search_pattern)) |
        (Supplier.company_name.ilike(search_pattern)) |
        (Supplier.phone.ilike(search_pattern))
    ).limit(limit).all()
    
    # Search sales
    sales = db.query(Sale).filter(
        Sale.shop_id == current_user.shop_id,
        Sale.invoice_no.ilike(search_pattern)
    ).limit(limit).all()
    
    return {
        "query": q,
        "results": {
            "products": [
                {
                    "id": str(p.id),
                    "type": "product",
                    "name": p.name,
                    "sku": p.sku,
                    "price": float(p.price_mrp),
                    "stock": p.current_stock
                }
                for p in products
            ],
            "customers": [
                {
                    "id": str(c.id),
                    "type": "customer",
                    "name": c.name,
                    "phone": c.phone,
                    "email": c.email
                }
                for c in customers
            ],
            "suppliers": [
                {
                    "id": str(s.id),
                    "type": "supplier",
                    "name": s.name,
                    "company": s.company_name,
                    "phone": s.phone
                }
                for s in suppliers
            ],
            "sales": [
                {
                    "id": str(s.id),
                    "type": "sale",
                    "invoice_no": s.invoice_no,
                    "total_amount": float(s.total_amount),
                    "date": s.created_at.isoformat()
                }
                for s in sales
            ]
        },
        "total": len(products) + len(customers) + len(suppliers) + len(sales)
    }


@router.get("/advanced/products")
async def advanced_product_search(
    name: str | None = Query(None),
    sku: str | None = Query(None),
    category_id: str | None = Query(None),
    min_price: Decimal | None = Query(None),
    max_price: Decimal | None = Query(None),
    min_stock: int | None = Query(None),
    max_stock: int | None = Query(None),
    is_active: bool | None = Query(None),
    low_stock_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Advanced product search with multiple filters.
    
    Args:
        name: Filter by product name (partial match)
        sku: Filter by SKU (partial match)
        category_id: Filter by category
        min_price: Minimum price
        max_price: Maximum price
        min_stock: Minimum stock level
        max_stock: Maximum stock level
        is_active: Filter by active status
        low_stock_only: Show only low stock products
        skip: Number of records to skip
        limit: Maximum number of records to return
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Filtered product list
    """
    if not current_user.shop_id:
        return {"products": [], "total": 0, "filters_applied": {}}
    
    query = db.query(Product).filter(Product.shop_id == current_user.shop_id)
    
    filters_applied = {}
    
    if name:
        query = query.filter(Product.name.ilike(f"%{name}%"))
        filters_applied["name"] = name
    
    if sku:
        query = query.filter(Product.sku.ilike(f"%{sku}%"))
        filters_applied["sku"] = sku
    
    if category_id:
        from uuid import UUID
        query = query.filter(Product.category_id == UUID(category_id))
        filters_applied["category_id"] = category_id
    
    if min_price is not None:
        query = query.filter(Product.price_mrp >= min_price)
        filters_applied["min_price"] = float(min_price)
    
    if max_price is not None:
        query = query.filter(Product.price_mrp <= max_price)
        filters_applied["max_price"] = float(max_price)
    
    if min_stock is not None:
        query = query.filter(Product.current_stock >= min_stock)
        filters_applied["min_stock"] = min_stock
    
    if max_stock is not None:
        query = query.filter(Product.current_stock <= max_stock)
        filters_applied["max_stock"] = max_stock
    
    if is_active is not None:
        query = query.filter(Product.is_active == is_active)
        filters_applied["is_active"] = is_active
    
    if low_stock_only:
        query = query.filter(Product.current_stock <= Product.min_stock_threshold)
        filters_applied["low_stock_only"] = True
    
    total = query.count()
    products = query.order_by(Product.name).offset(skip).limit(limit).all()
    
    return {
        "products": [
            {
                "id": str(p.id),
                "name": p.name,
                "sku": p.sku,
                "price": float(p.price_mrp),
                "cost": float(p.cost_price),
                "stock": p.current_stock,
                "min_stock": p.min_stock_threshold,
                "category_id": str(p.category_id) if p.category_id else None,
                "is_active": p.is_active
            }
            for p in products
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
        "filters_applied": filters_applied
    }


@router.get("/advanced/sales")
async def advanced_sales_search(
    invoice_no: str | None = Query(None),
    payment_type: str | None = Query(None),
    status: str | None = Query(None),
    min_amount: Decimal | None = Query(None),
    max_amount: Decimal | None = Query(None),
    start_date: datetime | None = Query(None),
    end_date: datetime | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Advanced sales search with multiple filters.
    
    Args:
        invoice_no: Filter by invoice number (partial match)
        payment_type: Filter by payment type (cash, card, upi, etc.)
        status: Filter by sale status (paid, pending, void, refunded)
        min_amount: Minimum sale amount
        max_amount: Maximum sale amount
        start_date: Start date for sales
        end_date: End date for sales
        skip: Number of records to skip
        limit: Maximum number of records to return
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Filtered sales list
    """
    if not current_user.shop_id:
        return {"sales": [], "total": 0, "filters_applied": {}}
    
    query = db.query(Sale).filter(Sale.shop_id == current_user.shop_id)
    
    filters_applied = {}
    
    if invoice_no:
        query = query.filter(Sale.invoice_no.ilike(f"%{invoice_no}%"))
        filters_applied["invoice_no"] = invoice_no
    
    if payment_type:
        query = query.filter(Sale.payment_type == payment_type)
        filters_applied["payment_type"] = payment_type
    
    if status:
        query = query.filter(Sale.status == status)
        filters_applied["status"] = status
    
    if min_amount is not None:
        query = query.filter(Sale.total_amount >= min_amount)
        filters_applied["min_amount"] = float(min_amount)
    
    if max_amount is not None:
        query = query.filter(Sale.total_amount <= max_amount)
        filters_applied["max_amount"] = float(max_amount)
    
    if start_date:
        query = query.filter(Sale.created_at >= start_date)
        filters_applied["start_date"] = start_date.isoformat()
    
    if end_date:
        query = query.filter(Sale.created_at <= end_date)
        filters_applied["end_date"] = end_date.isoformat()
    
    total = query.count()
    sales = query.order_by(Sale.created_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "sales": [
            {
                "id": str(s.id),
                "invoice_no": s.invoice_no,
                "total_amount": float(s.total_amount),
                "profit": float(s.profit),
                "payment_type": s.payment_type,
                "status": s.status,
                "date": s.created_at.isoformat()
            }
            for s in sales
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
        "filters_applied": filters_applied
    }

