"""
Inventory ledger utilities.
Ensures ACID-safe stock updates using stock_movements table as the source of truth.
"""
from decimal import Decimal
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.models.product import Product
from app.models.stock_movement import StockMovement, stock_movement_reason
from app.models.user import User


def get_current_stock(db: Session, product_id: str, shop_id: str) -> int:
    """
    Calculate current stock from stock_movements ledger.
    This is the single source of truth for stock levels.
    
    Args:
        db: Database session
        product_id: Product UUID
        shop_id: Shop UUID
        
    Returns:
        Current stock quantity (can be negative if there are issues)
    """
    result = db.query(
        func.sum(StockMovement.change_qty)
    ).filter(
        and_(
            StockMovement.product_id == product_id,
            StockMovement.shop_id == shop_id
        )
    ).scalar()
    
    return int(result) if result is not None else 0


def record_stock_movement(
    db: Session,
    shop_id: str,
    product_id: str,
    change_qty: int,
    reason: stock_movement_reason,
    created_by: Optional[str] = None,
    reference_type: Optional[str] = None,
    reference_id: Optional[str] = None,
    metadata: Optional[dict] = None
) -> StockMovement:
    """
    Record a stock movement in the ledger.
    This is the ONLY way stock should be updated - through ledger entries.
    
    Args:
        db: Database session
        shop_id: Shop UUID
        product_id: Product UUID
        change_qty: Quantity change (positive for increase, negative for decrease)
        reason: Reason for movement (sale, purchase, adjustment, etc.)
        created_by: User UUID who created this movement
        reference_type: Type of reference (e.g., 'sale', 'purchase')
        reference_id: ID of the reference record
        metadata: Additional metadata as JSON
        
    Returns:
        Created StockMovement record
        
    Raises:
        ValueError: If change_qty is zero
    """
    if change_qty == 0:
        raise ValueError("change_qty cannot be zero")
    
    movement = StockMovement(
        shop_id=shop_id,
        product_id=product_id,
        change_qty=change_qty,
        reason=reason,
        created_by=created_by,
        reference_type=reference_type,
        reference_id=reference_id,
        metadata=metadata or {}
    )
    
    db.add(movement)
    
    # Update product.current_stock for quick access (denormalized)
    # But ledger is still the source of truth
    product = db.query(Product).filter(Product.id == product_id).first()
    if product:
        # Recalculate from ledger to ensure consistency
        product.current_stock = get_current_stock(db, product_id, shop_id)
    
    return movement


def adjust_stock(
    db: Session,
    shop_id: str,
    product_id: str,
    new_quantity: int,
    created_by: Optional[str] = None,
    reason: str = "Adjustment"
) -> StockMovement:
    """
    Adjust stock to a specific quantity.
    Calculates the difference and records it as an adjustment.
    
    Args:
        db: Database session
        shop_id: Shop UUID
        product_id: Product UUID
        new_quantity: Target stock quantity
        created_by: User UUID
        reason: Reason for adjustment
        
    Returns:
        Created StockMovement record
    """
    current_stock = get_current_stock(db, product_id, shop_id)
    change_qty = new_quantity - current_stock
    
    if change_qty == 0:
        # No change needed
        return None
    
    return record_stock_movement(
        db=db,
        shop_id=shop_id,
        product_id=product_id,
        change_qty=change_qty,
        reason=stock_movement_reason.adjustment,
        created_by=created_by,
        reference_type="manual_adjustment",
        metadata={"reason": reason, "old_quantity": current_stock, "new_quantity": new_quantity}
    )


def validate_stock_availability(
    db: Session,
    product_id: str,
    shop_id: str,
    requested_qty: int
) -> bool:
    """
    Check if sufficient stock is available for a sale.
    
    Args:
        db: Database session
        product_id: Product UUID
        shop_id: Shop UUID
        requested_qty: Quantity requested
        
    Returns:
        True if stock is available, False otherwise
    """
    current_stock = get_current_stock(db, product_id, shop_id)
    return current_stock >= requested_qty

