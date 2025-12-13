"""
Profitability analysis API endpoints.
Provides profit analysis, trends, and loss-making item identification.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date

from app.db.session import get_db
from app.models.user import User
from app.utils.auth import get_current_active_user
from app.services.profitability_service import get_profitability_analysis
from app.schemas.profit import ProfitabilityResponse

router = APIRouter()


@router.get("", response_model=ProfitabilityResponse)
async def get_profitability(
    start_date: Optional[date] = Query(None, description="Start date (defaults to start of current month)"),
    end_date: Optional[date] = Query(None, description="End date (defaults to today)"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get complete profitability analysis.
    
    Args:
        start_date: Start date for analysis
        end_date: End date for analysis
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Complete profitability analysis including trends, categories, and loss-making items
    """
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    analysis = get_profitability_analysis(
        db=db,
        shop_id=current_user.shop_id,
        start_date=start_date,
        end_date=end_date
    )
    
    return analysis

