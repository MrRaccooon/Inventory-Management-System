"""
Invoice API endpoints.
Handles invoice generation and management.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.session import get_db
from app.models.user import User
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

