"""
Background worker for exporting data (Excel, PDF, etc.).
Uses Celery for asynchronous task processing.
"""
from celery import Celery
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import date
from typing import Optional
import io
import os

from app.config import settings
from app.db.session import SessionLocal
from app.services.reports_service import get_reports_data
from app.services.gst_service import get_gst_report

# Initialize Celery app (if configured)
if settings.CELERY_BROKER_URL:
    celery_app = Celery(
        "inventory_ledger",
        broker=settings.CELERY_BROKER_URL,
        backend=settings.CELERY_RESULT_BACKEND
    )
    
    celery_app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
    )
else:
    celery_app = None


def get_db_session():
    """
    Get a database session for worker tasks.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@celery_app.task(name="export_reports_excel")
def export_reports_excel_task(
    shop_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    report_type: str = "sales"
):
    """
    Celery task to export reports to Excel asynchronously.
    
    Args:
        shop_id: Shop UUID as string
        start_date: Start date as ISO string
        end_date: End date as ISO string
        report_type: Type of report (sales, inventory, gst, etc.)
        
    Returns:
        Dictionary with file path or error
    """
    if not celery_app:
        return export_reports_excel_sync(shop_id, start_date, end_date, report_type)
    
    db = next(get_db_session())
    try:
        start_date_obj = date.fromisoformat(start_date) if start_date else None
        end_date_obj = date.fromisoformat(end_date) if end_date else None
        
        if report_type == "sales" or report_type == "reports":
            data = get_reports_data(
                db=db,
                shop_id=UUID(shop_id),
                start_date=start_date_obj,
                end_date=end_date_obj
            )
        elif report_type == "gst":
            data = get_gst_report(
                db=db,
                shop_id=UUID(shop_id),
                start_date=start_date_obj,
                end_date=end_date_obj
            )
        else:
            return {"status": "error", "error": f"Unknown report type: {report_type}"}
        
        # Generate Excel file (simplified - would use openpyxl or pandas)
        # For now, return data structure
        return {
            "status": "success",
            "report_type": report_type,
            "data_available": True,
            "message": "Export would be generated here"
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }
    finally:
        db.close()


@celery_app.task(name="export_reports_pdf")
def export_reports_pdf_task(
    shop_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    report_type: str = "sales"
):
    """
    Celery task to export reports to PDF asynchronously.
    
    Args:
        shop_id: Shop UUID as string
        start_date: Start date as ISO string
        end_date: End date as ISO string
        report_type: Type of report
        
    Returns:
        Dictionary with file path or error
    """
    if not celery_app:
        return export_reports_pdf_sync(shop_id, start_date, end_date, report_type)
    
    db = next(get_db_session())
    try:
        start_date_obj = date.fromisoformat(start_date) if start_date else None
        end_date_obj = date.fromisoformat(end_date) if end_date else None
        
        if report_type == "gst":
            data = get_gst_report(
                db=db,
                shop_id=UUID(shop_id),
                start_date=start_date_obj,
                end_date=end_date_obj
            )
        else:
            return {"status": "error", "error": f"PDF export not supported for {report_type}"}
        
        # Generate PDF file (would use reportlab or weasyprint)
        return {
            "status": "success",
            "report_type": report_type,
            "data_available": True,
            "message": "PDF export would be generated here"
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }
    finally:
        db.close()


def export_reports_excel_sync(
    shop_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    report_type: str = "sales"
):
    """
    Synchronous fallback for Excel export.
    """
    db = next(get_db_session())
    try:
        return {
            "status": "success",
            "message": "Excel export would be generated synchronously"
        }
    finally:
        db.close()


def export_reports_pdf_sync(
    shop_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    report_type: str = "sales"
):
    """
    Synchronous fallback for PDF export.
    """
    db = next(get_db_session())
    try:
        return {
            "status": "success",
            "message": "PDF export would be generated synchronously"
        }
    finally:
        db.close()

