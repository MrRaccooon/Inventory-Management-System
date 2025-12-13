"""
GST and billing service.
Handles GST calculations, invoice generation, and GST reports.
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc
from uuid import UUID
from decimal import Decimal
from datetime import datetime, date

from app.models.sales import Sale, invoice_status
from app.models.invoices import Invoice
from app.models.shop import Shop


def get_gst_summary(
    db: Session,
    shop_id: UUID,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> dict:
    """
    Get GST summary for a period.
    
    Args:
        db: Database session
        shop_id: Shop UUID
        start_date: Start date (defaults to start of current month)
        end_date: End date (defaults to today)
        
    Returns:
        Dictionary with GST summary
    """
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = date.today().replace(day=1)
    
    # Get all sales in period
    sales = db.query(Sale).filter(
        and_(
            Sale.shop_id == shop_id,
            func.date(Sale.created_at) >= start_date,
            func.date(Sale.created_at) <= end_date,
            Sale.status != invoice_status.void
        )
    ).all()
    
    # Aggregate GST
    total_gst_collected = Decimal("0")
    total_base_amount = Decimal("0")
    
    for sale in sales:
        gst_breakdown = sale.gst_breakdown or {}
        total_gst_collected += Decimal(str(gst_breakdown.get("total_gst", 0)))
        total_base_amount += Decimal(str(gst_breakdown.get("base_amount", 0)))
    
    # GST payable (same as collected for now - would need purchase data for input credit)
    gst_payable = total_gst_collected
    
    # GST input credit (would come from purchase register)
    gst_input_credit = Decimal("0")  # Placeholder
    
    # Pending and completed bills
    pending_bills = db.query(Sale).filter(
        and_(
            Sale.shop_id == shop_id,
            func.date(Sale.created_at) >= start_date,
            func.date(Sale.created_at) <= end_date,
            Sale.status == invoice_status.pending
        )
    ).count()
    
    completed_bills = db.query(Sale).filter(
        and_(
            Sale.shop_id == shop_id,
            func.date(Sale.created_at) >= start_date,
            func.date(Sale.created_at) <= end_date,
            Sale.status == invoice_status.paid
        )
    ).count()
    
    return {
        "total_gst_collected": float(total_gst_collected),
        "gst_payable": float(gst_payable),
        "gst_input_credit": float(gst_input_credit),
        "pending_bills": pending_bills,
        "completed_bills": completed_bills
    }


def get_gst_report(
    db: Session,
    shop_id: UUID,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> dict:
    """
    Get detailed GST report.
    
    Args:
        db: Database session
        shop_id: Shop UUID
        start_date: Start date
        end_date: End date
        
    Returns:
        Dictionary with GST report data
    """
    summary = get_gst_summary(db, shop_id, start_date, end_date)
    
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = date.today().replace(day=1)
    
    # Get all invoices
    invoices = db.query(Invoice).join(
        Sale, Invoice.sale_id == Sale.id
    ).filter(
        and_(
            Sale.shop_id == shop_id,
            func.date(Sale.created_at) >= start_date,
            func.date(Sale.created_at) <= end_date
        )
    ).all()
    
    # Get sales for GST items
    sales = db.query(Sale).filter(
        and_(
            Sale.shop_id == shop_id,
            func.date(Sale.created_at) >= start_date,
            func.date(Sale.created_at) <= end_date,
            Sale.status != invoice_status.void
        )
    ).order_by(desc(Sale.created_at)).all()
    
    # Get shop GST number
    shop = db.query(Shop).filter(Shop.id == shop_id).first()
    
    gst_items = []
    for sale in sales:
        gst_breakdown = sale.gst_breakdown or {}
        customer_info = sale.customer_info or {}
        
        gst_items.append({
            "invoice_no": sale.invoice_no,
            "date": sale.created_at.isoformat(),
            "customer_name": customer_info.get("name"),
            "base_amount": float(gst_breakdown.get("base_amount", 0)),
            "cgst": float(gst_breakdown.get("cgst", 0)),
            "sgst": float(gst_breakdown.get("sgst", 0)),
            "igst": float(gst_breakdown.get("igst", 0)),
            "total_gst": float(gst_breakdown.get("total_gst", 0)),
            "total_amount": float(sale.total_amount),
            "gst_number": shop.gst_number if shop else None
        })
    
    return {
        "summary": summary,
        "invoices": [
            {
                "id": str(inv.id),
                "sale_id": str(inv.sale_id) if inv.sale_id else None,
                "invoice_no": inv.invoice_no,
                "pdf_url": inv.pdf_url,
                "created_at": inv.created_at.isoformat(),
                "issued_by": str(inv.issued_by) if inv.issued_by else None
            }
            for inv in invoices
        ],
        "gst_items": gst_items,
        "period_start": start_date.isoformat(),
        "period_end": end_date.isoformat()
    }


def create_invoice(
    db: Session,
    sale_id: UUID,
    shop_id: UUID,
    issued_by: Optional[UUID] = None
) -> Invoice:
    """
    Create an invoice record for a sale.
    
    Args:
        db: Database session
        sale_id: Sale UUID
        shop_id: Shop UUID
        issued_by: User UUID who issued the invoice
        
    Returns:
        Created Invoice object
    """
    # Verify sale exists and belongs to shop
    sale = db.query(Sale).filter(
        and_(Sale.id == sale_id, Sale.shop_id == shop_id)
    ).first()
    
    if not sale:
        raise ValueError(f"Sale {sale_id} not found")
    
    # Check if invoice already exists
    existing = db.query(Invoice).filter(Invoice.sale_id == sale_id).first()
    if existing:
        return existing
    
    invoice = Invoice(
        sale_id=sale_id,
        invoice_no=sale.invoice_no,
        issued_by=issued_by
    )
    
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice

