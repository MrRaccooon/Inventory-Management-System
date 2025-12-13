"""
Product/Inventory API endpoints.
Handles product CRUD operations and inventory management.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.session import get_db
from app.models.user import User
from app.utils.auth import get_current_active_user
from app.services.inventory_service import (
    create_product,
    get_product,
    list_products,
    update_product,
    adjust_product_stock,
    get_inventory_summary
)
from app.services.notification_service import check_and_alert_low_stock
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    ProductListResponse
)

router = APIRouter()


@router.get("/low-stock")
async def get_low_stock_products(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get list of products with low stock (at or below reorder point).
    
    Args:
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List of low stock products
    """
    from app.models.product import Product
    
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    low_stock_products = db.query(Product).filter(
        Product.shop_id == current_user.shop_id,
        Product.current_stock <= Product.reorder_point
    ).all()
    
    return {
        "low_stock_products": [
            {
                "id": str(p.id),
                "name": p.name,
                "sku": p.sku,
                "current_stock": p.current_stock,
                "reorder_point": p.reorder_point,
                "unit_price": float(p.unit_price),
                "unit_cost": float(p.unit_cost)
            }
            for p in low_stock_products
        ],
        "count": len(low_stock_products)
    }


@router.post("/check-low-stock")
async def trigger_low_stock_check(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Manually trigger low stock check and create alerts.
    
    Args:
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Number of alerts created
    """
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    notifications = check_and_alert_low_stock(db, current_user.shop_id)
    
    return {
        "message": f"Low stock check completed. Created {len(notifications)} alert(s)",
        "alerts_created": len(notifications),
        "notifications": [
            {
                "id": str(n.id),
                "title": n.title,
                "message": n.message
            }
            for n in notifications
        ]
    }


@router.post("", response_model=ProductResponse, status_code=201)
async def create_new_product(
    product_data: ProductCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create a new product.
    
    Args:
        product_data: Product creation data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Created product
    """
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    try:
        product = create_product(
            db=db,
            shop_id=current_user.shop_id,
            product_data=product_data,
            created_by=current_user.id
        )
        return product
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=ProductListResponse)
async def list_all_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    category_id: Optional[UUID] = Query(None),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    low_stock_only: bool = Query(False),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List all products with filtering and pagination.
    
    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        category_id: Filter by category
        search: Search in name, SKU, or barcode
        is_active: Filter by active status
        low_stock_only: Only return products below threshold
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Paginated list of products
    """
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    products, total = list_products(
        db=db,
        shop_id=current_user.shop_id,
        skip=skip,
        limit=limit,
        category_id=category_id,
        search=search,
        is_active=is_active,
        low_stock_only=low_stock_only
    )
    
    return {
        "items": products,
        "total": total,
        "page": skip // limit + 1,
        "page_size": limit
    }


@router.get("/summary")
async def get_inventory_summary_endpoint(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get inventory summary statistics.
    
    Args:
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Inventory summary dictionary
    """
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    return get_inventory_summary(db=db, shop_id=current_user.shop_id)


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product_by_id(
    product_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get a single product by ID.
    
    Args:
        product_id: Product UUID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Product details
    """
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    product = get_product(db=db, product_id=product_id, shop_id=current_user.shop_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return product


@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product_by_id(
    product_id: UUID,
    product_data: ProductUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update a product.
    
    Args:
        product_id: Product UUID
        product_data: Update data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Updated product
    """
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    product = update_product(
        db=db,
        product_id=product_id,
        shop_id=current_user.shop_id,
        product_data=product_data,
        updated_by=current_user.id
    )
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return product


@router.post("/{product_id}/adjust-stock", response_model=ProductResponse)
async def adjust_stock_endpoint(
    product_id: UUID,
    new_quantity: int = Query(..., ge=0),
    reason: str = Query("Manual adjustment"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Adjust product stock to a specific quantity.
    
    Args:
        product_id: Product UUID
        new_quantity: Target stock quantity
        reason: Reason for adjustment
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Updated product with new stock level
    """
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    product = adjust_product_stock(
        db=db,
        product_id=product_id,
        shop_id=current_user.shop_id,
        new_quantity=new_quantity,
        reason=reason,
        created_by=current_user.id
    )
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return product

