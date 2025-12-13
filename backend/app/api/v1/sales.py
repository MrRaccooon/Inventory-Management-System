"""
Sales API endpoints.
Handles sale creation, listing, and management.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime

from app.db.session import get_db
from app.models.user import User
from app.utils.auth import get_current_active_user
from app.services.sales_service import (
    create_sale,
    get_sale,
    list_sales,
    update_sale,
    void_sale
)
from app.schemas.sales import (
    SaleCreate,
    SaleUpdate,
    SaleResponse,
    SaleListResponse,
    RefundRequest
)

router = APIRouter()


@router.get("/payment-methods")
async def get_payment_methods():
    """
    Get list of available payment methods.
    
    Returns:
        List of payment methods with their codes
    """
    return {
        "payment_methods": [
            {"code": "cash", "name": "Cash", "description": "Cash payment"},
            {"code": "card", "name": "Card", "description": "Debit/Credit card"},
            {"code": "upi", "name": "UPI", "description": "UPI payment (Google Pay, PhonePe, etc.)"},
            {"code": "credit", "name": "Credit", "description": "Credit/Account payment"},
            {"code": "other", "name": "Other", "description": "Other payment methods"}
        ]
    }


@router.get("/payment-stats")
async def get_payment_stats(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get payment method statistics.
    
    Args:
        start_date: Start date for stats
        end_date: End date for stats
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Payment method breakdown
    """
    from app.models.sales import Sale
    from sqlalchemy import func
    
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    query = db.query(
        Sale.payment_type,
        func.count(Sale.id).label('count'),
        func.sum(Sale.total_amount).label('total_amount')
    ).filter(
        Sale.shop_id == current_user.shop_id,
        Sale.status.in_(['paid', 'pending'])
    )
    
    if start_date:
        query = query.filter(Sale.created_at >= start_date)
    if end_date:
        query = query.filter(Sale.created_at <= end_date)
    
    results = query.group_by(Sale.payment_type).all()
    
    payment_stats = [
        {
            "payment_type": row.payment_type,
            "count": row.count,
            "total_amount": float(row.total_amount or 0)
        }
        for row in results
    ]
    
    return {"payment_stats": payment_stats}


@router.post("", response_model=SaleResponse, status_code=201)
async def create_new_sale(
    sale_data: SaleCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create a new sale with items.
    Automatically updates stock through ledger system.
    
    Args:
        sale_data: Sale creation data with items
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Created sale with calculated totals and GST
    """
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    try:
        sale = create_sale(
            db=db,
            shop_id=current_user.shop_id,
            sale_data=sale_data,
            created_by=current_user.id
        )
        return sale
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=SaleListResponse)
async def list_all_sales(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    payment_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List all sales with filtering and pagination.
    
    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        start_date: Filter sales from this date
        end_date: Filter sales until this date
        payment_type: Filter by payment type
        status: Filter by status
        search: Search in invoice number
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Paginated list of sales
    """
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    sales, total = list_sales(
        db=db,
        shop_id=current_user.shop_id,
        skip=skip,
        limit=limit,
        start_date=start_date,
        end_date=end_date,
        payment_type_filter=payment_type,
        status_filter=status,
        search=search
    )
    
    return {
        "items": sales,
        "total": total,
        "page": skip // limit + 1,
        "page_size": limit
    }


@router.get("/{sale_id}", response_model=SaleResponse)
async def get_sale_by_id(
    sale_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get a single sale by ID.
    
    Args:
        sale_id: Sale UUID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Sale details with items
    """
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    sale = get_sale(db=db, sale_id=sale_id, shop_id=current_user.shop_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    return sale


@router.patch("/{sale_id}", response_model=SaleResponse)
async def update_sale_by_id(
    sale_id: UUID,
    sale_data: SaleUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update a sale (limited fields).
    
    Args:
        sale_id: Sale UUID
        sale_data: Update data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Updated sale
    """
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    sale = update_sale(
        db=db,
        sale_id=sale_id,
        shop_id=current_user.shop_id,
        sale_data=sale_data,
        updated_by=current_user.id
    )
    
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    return sale


@router.post("/{sale_id}/void", response_model=SaleResponse)
async def void_sale_endpoint(
    sale_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Void a sale and restore stock.
    
    Args:
        sale_id: Sale UUID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Voided sale
    """
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    sale = void_sale(
        db=db,
        sale_id=sale_id,
        shop_id=current_user.shop_id,
        voided_by=current_user.id
    )
    
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    return sale


@router.post("/{sale_id}/refund", response_model=SaleResponse)
async def refund_sale(
    sale_id: UUID,
    refund_data: RefundRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Process a full or partial refund for a sale.
    Restores stock for refunded items.
    
    Args:
        sale_id: Sale UUID
        refund_data: Refund details (reason, amount, items)
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Refunded sale
    """
    from app.models.sales import Sale
    from app.models.sale_item import SaleItem
    from app.utils.ledger import record_stock_movement
    
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    # Get the sale
    sale = db.query(Sale).filter(
        Sale.id == sale_id,
        Sale.shop_id == current_user.shop_id
    ).first()
    
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    if sale.status == 'refunded':
        raise HTTPException(status_code=400, detail="Sale is already refunded")
    
    if sale.status == 'void':
        raise HTTPException(status_code=400, detail="Cannot refund a voided sale")
    
    # Process full or partial refund
    if refund_data.items:
        # Partial refund - specific items
        for item_id in refund_data.items:
            item = db.query(SaleItem).filter(
                SaleItem.id == item_id,
                SaleItem.sale_id == sale_id
            ).first()
            
            if item:
                # Restore stock for this item
                record_stock_movement(
                    db=db,
                    shop_id=current_user.shop_id,
                    product_id=item.product_id,
                    change_qty=item.quantity,  # Positive to restore
                    reason="return",
                    reference_type="sale",
                    reference_id=sale_id,
                    created_by=current_user.id,
                    metadata={"refund_reason": refund_data.reason, "item_id": str(item_id)}
                )
    else:
        # Full refund - all items
        for item in sale.items:
            record_stock_movement(
                db=db,
                shop_id=current_user.shop_id,
                product_id=item.product_id,
                change_qty=item.quantity,  # Positive to restore
                reason="return",
                reference_type="sale",
                reference_id=sale_id,
                created_by=current_user.id,
                metadata={"refund_reason": refund_data.reason}
            )
    
    # Update sale status
    sale.status = 'refunded'
    sale.notes = f"{sale.notes or ''}\nRefund: {refund_data.reason}".strip()
    sale.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(sale)
    
    return sale

