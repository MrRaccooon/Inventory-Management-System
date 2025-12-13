"""
Reports API endpoints.
Provides comprehensive reports for sales, inventory, and performance.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date

from app.db.session import get_db
from app.models.user import User
from app.utils.auth import get_current_active_user
from app.services.reports_service import get_reports_data
from app.schemas.reports import ReportResponse

router = APIRouter()


@router.get("", response_model=ReportResponse)
async def get_reports(
    start_date: Optional[date] = Query(None, description="Start date (defaults to start of current month)"),
    end_date: Optional[date] = Query(None, description="End date (defaults to today)"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive reports data.
    
    Args:
        start_date: Start date for report data
        end_date: End date for report data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Complete report data including sales, profit, categories, inventory, and employees
    """
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    report_data = get_reports_data(
        db=db,
        shop_id=current_user.shop_id,
        start_date=start_date,
        end_date=end_date
    )
    
    return report_data

