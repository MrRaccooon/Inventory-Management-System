"""
GST and Billing API endpoints.
Handles GST reports, invoice management, and billing operations.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import date

from app.db.session import get_db
from app.models.user import User
from app.utils.auth import get_current_active_user
from app.services.gst_service import (
    get_gst_summary,
    get_gst_report,
    create_invoice
)
from app.schemas.gst import GSTReportResponse, GSTSummary, InvoiceResponse

router = APIRouter()


@router.get("/summary", response_model=GSTSummary)
async def get_gst_summary_endpoint(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get GST summary for a period.
    
    Args:
        start_date: Start date (defaults to start of current month)
        end_date: End date (defaults to today)
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        GST summary with totals and counts
    """
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    summary = get_gst_summary(
        db=db,
        shop_id=current_user.shop_id,
        start_date=start_date,
        end_date=end_date
    )
    
    return summary


@router.get("/report", response_model=GSTReportResponse)
async def get_gst_report_endpoint(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed GST report with invoice breakdown.
    
    Args:
        start_date: Start date (defaults to start of current month)
        end_date: End date (defaults to today)
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Complete GST report with summary, invoices, and line items
    """
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    report = get_gst_report(
        db=db,
        shop_id=current_user.shop_id,
        start_date=start_date,
        end_date=end_date
    )
    
    return report


@router.post("/invoices/{sale_id}", response_model=InvoiceResponse, status_code=201)
async def create_invoice_endpoint(
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

