"""
Inventory management service.
Handles product CRUD, stock management, and inventory operations.
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from uuid import UUID
from decimal import Decimal

from app.models.product import Product
from app.models.categories import Category
from app.models.stock_movement import StockMovement, stock_movement_reason
from app.utils.ledger import record_stock_movement, get_current_stock
from app.utils.audit import log_action
from app.schemas.product import ProductCreate, ProductUpdate


def create_product(
    db: Session,
    shop_id: UUID,
    product_data: ProductCreate,
    created_by: Optional[UUID] = None
) -> Product:
    """
    Create a new product and optionally set initial stock.
    
    Args:
        db: Database session
        shop_id: Shop UUID
        product_data: Product creation data
        created_by: User UUID who created the product
        
    Returns:
        Created Product object
    """
    # Create product
    product = Product(
        shop_id=shop_id,
        sku=product_data.sku,
        name=product_data.name,
        description=product_data.description,
        category_id=product_data.category_id,
        price_mrp=product_data.price_mrp,
        cost_price=product_data.cost_price,
        min_stock_threshold=product_data.min_stock_threshold,
        barcode=product_data.barcode,
        reorder_qty=product_data.reorder_qty,
        lead_time_days=product_data.lead_time_days,
        attributes=product_data.attributes,
        is_active=product_data.is_active,
    )
    
    db.add(product)
    db.flush()  # Get product ID
    
    # Set initial stock if provided
    if product_data.initial_stock > 0:
        record_stock_movement(
            db=db,
            shop_id=shop_id,
            product_id=product.id,
            change_qty=product_data.initial_stock,
            reason=stock_movement_reason.purchase,
            created_by=created_by,
            reference_type="initial_stock",
            metadata={"initial_setup": True}
        )
    
    # Audit log
    log_action(
        db=db,
        action="create_product",
        user_id=created_by,
        shop_id=shop_id,
        object_type="product",
        object_id=product.id,
        payload={"sku": product_data.sku, "name": product_data.name}
    )
    
    db.commit()
    db.refresh(product)
    return product


def get_product(db: Session, product_id: UUID, shop_id: UUID) -> Optional[Product]:
    """
    Get a single product by ID.
    
    Args:
        db: Database session
        product_id: Product UUID
        shop_id: Shop UUID (for security)
        
    Returns:
        Product object or None
    """
    return db.query(Product).filter(
        and_(Product.id == product_id, Product.shop_id == shop_id)
    ).first()


def list_products(
    db: Session,
    shop_id: UUID,
    skip: int = 0,
    limit: int = 100,
    category_id: Optional[UUID] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    low_stock_only: bool = False
) -> tuple[List[Product], int]:
    """
    List products with filtering and pagination.
    
    Args:
        db: Database session
        shop_id: Shop UUID
        skip: Number of records to skip
        limit: Maximum number of records to return
        category_id: Filter by category
        search: Search in name, SKU, or barcode
        is_active: Filter by active status
        low_stock_only: Only return products below threshold
        
    Returns:
        Tuple of (products list, total count)
    """
    query = db.query(Product).filter(Product.shop_id == shop_id)
    
    # Apply filters
    if category_id:
        query = query.filter(Product.category_id == category_id)
    
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Product.name.ilike(search_pattern),
                Product.sku.ilike(search_pattern),
                Product.barcode.ilike(search_pattern)
            )
        )
    
    if is_active is not None:
        query = query.filter(Product.is_active == is_active)
    
    if low_stock_only:
        query = query.filter(
            Product.current_stock <= Product.min_stock_threshold
        )
    
    # Get total count
    total = query.count()
    
    # Apply pagination and ordering
    products = query.order_by(desc(Product.created_at)).offset(skip).limit(limit).all()
    
    # Update current_stock from ledger for each product
    for product in products:
        product.current_stock = get_current_stock(db, product.id, shop_id)
    
    return products, total


def update_product(
    db: Session,
    product_id: UUID,
    shop_id: UUID,
    product_data: ProductUpdate,
    updated_by: Optional[UUID] = None
) -> Optional[Product]:
    """
    Update a product.
    
    Args:
        db: Database session
        product_id: Product UUID
        shop_id: Shop UUID
        product_data: Update data
        updated_by: User UUID
        
    Returns:
        Updated Product object or None if not found
    """
    product = get_product(db, product_id, shop_id)
    if not product:
        return None
    
    # Update fields
    update_data = product_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)
    
    # Audit log
    log_action(
        db=db,
        action="update_product",
        user_id=updated_by,
        shop_id=shop_id,
        object_type="product",
        object_id=product_id,
        payload=update_data
    )
    
    db.commit()
    db.refresh(product)
    return product


def adjust_product_stock(
    db: Session,
    product_id: UUID,
    shop_id: UUID,
    new_quantity: int,
    reason: str,
    created_by: Optional[UUID] = None
) -> Optional[Product]:
    """
    Adjust product stock to a specific quantity.
    
    Args:
        db: Database session
        product_id: Product UUID
        shop_id: Shop UUID
        new_quantity: Target stock quantity
        reason: Reason for adjustment
        created_by: User UUID
        
    Returns:
        Updated Product object or None if not found
    """
    from app.utils.ledger import adjust_stock
    
    product = get_product(db, product_id, shop_id)
    if not product:
        return None
    
    adjust_stock(
        db=db,
        shop_id=shop_id,
        product_id=product_id,
        new_quantity=new_quantity,
        created_by=created_by,
        reason=reason
    )
    
    # Audit log
    log_action(
        db=db,
        action="adjust_stock",
        user_id=created_by,
        shop_id=shop_id,
        object_type="product",
        object_id=product_id,
        payload={"new_quantity": new_quantity, "reason": reason}
    )
    
    db.commit()
    db.refresh(product)
    product.current_stock = get_current_stock(db, product_id, shop_id)
    return product


def get_inventory_summary(db: Session, shop_id: UUID) -> dict:
    """
    Get inventory summary statistics.
    
    Args:
        db: Database session
        shop_id: Shop UUID
        
    Returns:
        Dictionary with inventory statistics
    """
    products = db.query(Product).filter(Product.shop_id == shop_id).all()
    
    total_products = len(products)
    items_in_stock = sum(1 for p in products if get_current_stock(db, p.id, shop_id) > 0)
    low_stock_count = sum(
        1 for p in products
        if get_current_stock(db, p.id, shop_id) <= p.min_stock_threshold
        and get_current_stock(db, p.id, shop_id) > 0
    )
    out_of_stock = sum(1 for p in products if get_current_stock(db, p.id, shop_id) <= 0)
    
    # Calculate total stock value
    total_stock_value = sum(
        Decimal(str(get_current_stock(db, p.id, shop_id))) * p.cost_price
        for p in products
    )
    
    # New products this month
    from datetime import datetime, timedelta
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    new_this_month = db.query(Product).filter(
        and_(
            Product.shop_id == shop_id,
            Product.created_at >= month_start
        )
    ).count()
    
    return {
        "total_products": total_products,
        "items_in_stock": items_in_stock,
        "low_stock_count": low_stock_count,
        "out_of_stock": out_of_stock,
        "total_stock_value": float(total_stock_value),
        "new_this_month": new_this_month,
    }

