"""
Notification service for automated alerts.
"""
from sqlalchemy.orm import Session
from uuid import UUID
import uuid
from app.models.notifications import Notification
from app.models.product import Product


def create_low_stock_alert(
    db: Session,
    shop_id: UUID,
    product: Product,
    target_user_id: UUID | None = None
) -> Notification:
    """
    Create a low stock alert notification.
    
    Args:
        db: Database session
        shop_id: Shop ID
        product: Product that is low on stock
        target_user_id: Specific user to notify, or None for all
        
    Returns:
        Created notification
    """
    notification = Notification(
        id=uuid.uuid4(),
        shop_id=shop_id,
        target_user_id=target_user_id,
        type="warning",
        title="Low Stock Alert",
        message=f"Product '{product.name}' (SKU: {product.sku}) is running low. Current stock: {product.current_stock}, Reorder point: {product.reorder_point}",
        is_read=False
    )
    
    db.add(notification)
    db.commit()
    db.refresh(notification)
    
    return notification


def check_and_alert_low_stock(db: Session, shop_id: UUID) -> list[Notification]:
    """
    Check all products for low stock and create alerts.
    
    Args:
        db: Database session
        shop_id: Shop ID
        
    Returns:
        List of created notifications
    """
    # Find products below reorder point
    low_stock_products = db.query(Product).filter(
        Product.shop_id == shop_id,
        Product.current_stock <= Product.reorder_point
    ).all()
    
    notifications = []
    for product in low_stock_products:
        # Check if alert already exists for this product
        existing_alert = db.query(Notification).filter(
            Notification.shop_id == shop_id,
            Notification.type == "warning",
            Notification.title == "Low Stock Alert",
            Notification.message.like(f"%{product.sku}%"),
            Notification.is_read == False
        ).first()
        
        if not existing_alert:
            notification = create_low_stock_alert(db, shop_id, product)
            notifications.append(notification)
    
    return notifications

