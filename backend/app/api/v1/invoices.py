"""
Invoice API endpoints.
Handles invoice generation and management.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime

from app.db.session import get_db
from app.models.user import User
from app.models.invoices import Invoice
from app.models.sales import Sale
from app.utils.auth import get_current_active_user
from app.services.gst_service import create_invoice
from app.schemas.gst import InvoiceResponse

router = APIRouter()


@router.post("/{sale_id}", response_model=InvoiceResponse, status_code=201)
async def create_invoice_for_sale(
    sale_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create an invoice record for a sale.
    
    Args:
        sale_id: Sale UUID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Created invoice record
    """
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    try:
        invoice = create_invoice(
            db=db,
            sale_id=sale_id,
            shop_id=current_user.shop_id,
            issued_by=current_user.id
        )
        return invoice
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=list[InvoiceResponse])
async def list_invoices(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List all invoices for the current shop.
    
    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        start_date: Filter invoices from this date
        end_date: Filter invoices until this date
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List of invoices
    """
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    # Join with sales to filter by shop
    query = db.query(Invoice).join(Sale).filter(Sale.shop_id == current_user.shop_id)
    
    if start_date:
        query = query.filter(Invoice.created_at >= start_date)
    if end_date:
        query = query.filter(Invoice.created_at <= end_date)
    
    invoices = query.order_by(Invoice.created_at.desc()).offset(skip).limit(limit).all()
    
    return invoices


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific invoice by ID.
    
    Args:
        invoice_id: Invoice UUID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Invoice details
    """
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    invoice = db.query(Invoice).join(Sale).filter(
        Invoice.id == invoice_id,
        Sale.shop_id == current_user.shop_id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return invoice


@router.get("/sale/{sale_id}", response_model=list[InvoiceResponse])
async def get_invoices_by_sale(
    sale_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get all invoices for a specific sale.
    
    Args:
        sale_id: Sale UUID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List of invoices for the sale
    """
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    # Verify sale belongs to user's shop
    sale = db.query(Sale).filter(
        Sale.id == sale_id,
        Sale.shop_id == current_user.shop_id
    ).first()
    
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    invoices = db.query(Invoice).filter(Invoice.sale_id == sale_id).all()
    
    return invoices


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(
    invoice_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Delete an invoice.
    Only owners and managers can delete invoices.
    
    Args:
        invoice_id: Invoice UUID
        current_user: Current authenticated user
        db: Database session
    """
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    # Check permissions
    if current_user.role not in ['owner', 'manager', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and managers can delete invoices"
        )
    
    invoice = db.query(Invoice).join(Sale).filter(
        Invoice.id == invoice_id,
        Sale.shop_id == current_user.shop_id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    db.delete(invoice)
    db.commit()
    
    return None

