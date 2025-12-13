"""
Sales management service.
Handles sale creation, processing, and stock updates with ACID safety.
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc
from uuid import UUID
from decimal import Decimal
from datetime import datetime

from app.models.sales import Sale, payment_type, invoice_status
from app.models.sale_item import SaleItem
from app.models.product import Product
from app.utils.ledger import record_stock_movement, validate_stock_availability, get_current_stock
from app.utils.gst import calculate_line_item_gst, aggregate_gst_breakdown
from app.utils.audit import log_action
from app.schemas.sales import SaleCreate, SaleUpdate
from app.config import settings


def generate_invoice_number(db: Session, shop_id: UUID) -> str:
    """
    Generate a unique invoice number.
    Format: INV-YYYYMMDD-XXXX (e.g., INV-20240115-0001)
    
    Args:
        db: Database session
        shop_id: Shop UUID
        
    Returns:
        Unique invoice number string
    """
    today = datetime.utcnow().date()
    date_prefix = today.strftime("%Y%m%d")
    
    # Get the last invoice number for today
    last_sale = db.query(Sale).filter(
        and_(
            Sale.shop_id == shop_id,
            func.date(Sale.created_at) == today
        )
    ).order_by(desc(Sale.created_at)).first()
    
    if last_sale and last_sale.invoice_no.startswith(f"INV-{date_prefix}"):
        # Extract sequence number and increment
        try:
            sequence = int(last_sale.invoice_no.split("-")[-1])
            sequence += 1
        except (ValueError, IndexError):
            sequence = 1
    else:
        sequence = 1
    
    return f"INV-{date_prefix}-{sequence:04d}"


def create_sale(
    db: Session,
    shop_id: UUID,
    sale_data: SaleCreate,
    created_by: Optional[UUID] = None
) -> Sale:
    """
    Create a new sale with items.
    This function ensures ACID safety by:
    1. Validating stock availability
    2. Creating sale record
    3. Creating sale items
    4. Recording stock movements (ledger)
    5. Calculating GST and totals
    
    Args:
        db: Database session
        shop_id: Shop UUID
        sale_data: Sale creation data
        created_by: User UUID who created the sale
        
    Returns:
        Created Sale object
        
    Raises:
        ValueError: If stock is insufficient or invalid data
    """
    # Validate stock availability for all items
    for item in sale_data.items:
        if not validate_stock_availability(db, item.product_id, shop_id, item.quantity):
            product = db.query(Product).filter(Product.id == item.product_id).first()
            raise ValueError(
                f"Insufficient stock for product {product.name if product else item.product_id}. "
                f"Requested: {item.quantity}, Available: {get_current_stock(db, item.product_id, shop_id)}"
            )
    
    # Generate invoice number
    invoice_no = generate_invoice_number(db, shop_id)
    
    # Create sale record
    sale = Sale(
        shop_id=shop_id,
        invoice_no=invoice_no,
        payment_type=payment_type(sale_data.payment_type),
        customer_info=sale_data.customer_info,
        notes=sale_data.notes,
        status=invoice_status.paid,
        created_by=created_by,
    )
    
    db.add(sale)
    db.flush()  # Get sale ID
    
    # Process each item
    total_amount = Decimal("0")
    total_cost = Decimal("0")
    line_items_gst = []
    
    for item_data in sale_data.items:
        # Get product details
        product = db.query(Product).filter(Product.id == item_data.product_id).first()
        if not product:
            raise ValueError(f"Product {item_data.product_id} not found")
        
        # Calculate line item totals with GST
        gst_breakdown = calculate_line_item_gst(
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            discount=Decimal(str(item_data.discount)),
            gst_rate=item_data.gst_rate or sale_data.gst_rate
        )
        
        # Create sale item
        sale_item = SaleItem(
            sale_id=sale.id,
            product_id=item_data.product_id,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            unit_cost=product.cost_price,
            discount=Decimal(str(item_data.discount)),
            tax_breakdown=gst_breakdown,
            line_total=gst_breakdown["line_total"],
        )
        
        db.add(sale_item)
        
        # Record stock movement (decrease stock)
        record_stock_movement(
            db=db,
            shop_id=shop_id,
            product_id=item_data.product_id,
            change_qty=-item_data.quantity,  # Negative for sale
            reason=stock_movement_reason.sale,
            created_by=created_by,
            reference_type="sale",
            reference_id=sale.id,
            metadata={
                "invoice_no": invoice_no,
                "quantity": item_data.quantity,
                "unit_price": float(item_data.unit_price)
            }
        )
        
        # Accumulate totals
        total_amount += gst_breakdown["line_total"]
        total_cost += Decimal(str(item_data.quantity)) * product.cost_price
        line_items_gst.append(gst_breakdown)
    
    # Aggregate GST breakdown
    aggregated_gst = aggregate_gst_breakdown(line_items_gst)
    
    # Calculate profit
    profit = total_amount - total_cost
    
    # Update sale totals
    sale.total_amount = total_amount
    sale.total_cost = total_cost
    sale.profit = profit
    sale.gst_breakdown = aggregated_gst
    
    # Audit log
    log_action(
        db=db,
        action="create_sale",
        user_id=created_by,
        shop_id=shop_id,
        object_type="sale",
        object_id=sale.id,
        payload={
            "invoice_no": invoice_no,
            "total_amount": float(total_amount),
            "item_count": len(sale_data.items)
        }
    )
    
    db.commit()
    db.refresh(sale)
    return sale


def get_sale(db: Session, sale_id: UUID, shop_id: UUID) -> Optional[Sale]:
    """
    Get a single sale by ID.
    
    Args:
        db: Database session
        sale_id: Sale UUID
        shop_id: Shop UUID (for security)
        
    Returns:
        Sale object or None
    """
    return db.query(Sale).filter(
        and_(Sale.id == sale_id, Sale.shop_id == shop_id)
    ).first()


def list_sales(
    db: Session,
    shop_id: UUID,
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    payment_type_filter: Optional[str] = None,
    status_filter: Optional[str] = None,
    search: Optional[str] = None
) -> tuple[List[Sale], int]:
    """
    List sales with filtering and pagination.
    
    Args:
        db: Database session
        shop_id: Shop UUID
        skip: Number of records to skip
        limit: Maximum number of records to return
        start_date: Filter sales from this date
        end_date: Filter sales until this date
        payment_type_filter: Filter by payment type
        status_filter: Filter by status
        search: Search in invoice number
        
    Returns:
        Tuple of (sales list, total count)
    """
    query = db.query(Sale).filter(Sale.shop_id == shop_id)
    
    # Apply filters
    if start_date:
        query = query.filter(Sale.created_at >= start_date)
    
    if end_date:
        query = query.filter(Sale.created_at <= end_date)
    
    if payment_type_filter:
        query = query.filter(Sale.payment_type == payment_type_filter)
    
    if status_filter:
        query = query.filter(Sale.status == status_filter)
    
    if search:
        query = query.filter(Sale.invoice_no.ilike(f"%{search}%"))
    
    # Get total count
    total = query.count()
    
    # Apply pagination and ordering
    sales = query.order_by(desc(Sale.created_at)).offset(skip).limit(limit).all()
    
    return sales, total


def update_sale(
    db: Session,
    sale_id: UUID,
    shop_id: UUID,
    sale_data: SaleUpdate,
    updated_by: Optional[UUID] = None
) -> Optional[Sale]:
    """
    Update a sale (limited fields - cannot modify items after creation).
    
    Args:
        db: Database session
        sale_id: Sale UUID
        shop_id: Shop UUID
        sale_data: Update data
        updated_by: User UUID
        
    Returns:
        Updated Sale object or None if not found
    """
    sale = get_sale(db, sale_id, shop_id)
    if not sale:
        return None
    
    # Only allow updating certain fields
    update_data = sale_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field in ["payment_type", "customer_info", "notes", "status"]:
            if field == "payment_type":
                setattr(sale, field, payment_type(value))
            elif field == "status":
                setattr(sale, field, invoice_status(value))
            else:
                setattr(sale, field, value)
    
    sale.updated_at = datetime.utcnow()
    
    # Audit log
    log_action(
        db=db,
        action="update_sale",
        user_id=updated_by,
        shop_id=shop_id,
        object_type="sale",
        object_id=sale_id,
        payload=update_data
    )
    
    db.commit()
    db.refresh(sale)
    return sale


def void_sale(
    db: Session,
    sale_id: UUID,
    shop_id: UUID,
    voided_by: Optional[UUID] = None
) -> Optional[Sale]:
    """
    Void a sale and restore stock.
    
    Args:
        db: Database session
        sale_id: Sale UUID
        shop_id: Shop UUID
        voided_by: User UUID
        
    Returns:
        Updated Sale object or None if not found
    """
    sale = get_sale(db, sale_id, shop_id)
    if not sale:
        return None
    
    if sale.status == invoice_status.void:
        return sale  # Already voided
    
    # Restore stock for each item
    for item in sale.items:
        record_stock_movement(
            db=db,
            shop_id=shop_id,
            product_id=item.product_id,
            change_qty=item.quantity,  # Positive to restore
            reason=stock_movement_reason.return_,
            created_by=voided_by,
            reference_type="sale_void",
            reference_id=sale.id,
            metadata={"original_invoice_no": sale.invoice_no}
        )
    
    # Update sale status
    sale.status = invoice_status.void
    
    # Audit log
    log_action(
        db=db,
        action="void_sale",
        user_id=voided_by,
        shop_id=shop_id,
        object_type="sale",
        object_id=sale_id,
        payload={"invoice_no": sale.invoice_no}
    )
    
    db.commit()
    db.refresh(sale)
    return sale

