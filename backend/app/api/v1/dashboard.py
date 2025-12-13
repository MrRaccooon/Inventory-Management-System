"""
Dashboard API endpoints.
Provides aggregated data for the main dashboard.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date

from app.db.session import get_db
from app.models.user import User
from app.utils.auth import get_current_active_user
from app.services.dashboard_service import get_dashboard_data
from app.schemas.dashboard import DashboardResponse

router = APIRouter()


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    start_date: Optional[date] = Query(None, description="Start date for dashboard data"),
    end_date: Optional[date] = Query(None, description="End date for dashboard data"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get complete dashboard data including KPIs, trends, and alerts.
    
    Args:
        start_date: Optional start date (defaults to 30 days ago)
        end_date: Optional end date (defaults to today)
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        DashboardResponse with all dashboard data
    """
    if not current_user.shop_id:
        raise HTTPException(
            status_code=400,
            detail="User is not associated with a shop"
        )
    
    dashboard_data = get_dashboard_data(
        db=db,
        shop_id=current_user.shop_id,
        start_date=start_date,
        end_date=end_date
    )
    
    return dashboard_data

