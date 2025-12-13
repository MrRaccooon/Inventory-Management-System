"""
AI Analytics API endpoints.
Provides AI-powered insights, forecasts, and recommendations.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import date

from app.db.session import get_db
from app.models.user import User
from app.utils.auth import get_current_active_user
from app.services.ai_service import (
    get_or_create_ai_insights,
    generate_forecast
)
from app.schemas.ai_analytics import AIAnalyticsResponse

router = APIRouter()


@router.get("", response_model=AIAnalyticsResponse)
async def get_ai_analytics(
    force_refresh: bool = Query(False, description="Force regeneration of insights"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get AI analytics and insights.
    Returns cached insights if available, otherwise generates new ones.
    
    Args:
        force_refresh: Force regeneration of insights (bypass cache)
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        AI analytics with predictions, recommendations, and insights
    """
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    insights = get_or_create_ai_insights(
        db=db,
        shop_id=current_user.shop_id,
        force_refresh=force_refresh
    )
    
    return insights


@router.post("/forecast")
async def generate_forecast_endpoint(
    product_id: Optional[UUID] = Query(None, description="Specific product ID, or all products if not provided"),
    forecast_date: Optional[date] = Query(None, description="Date to forecast for (defaults to next month)"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Generate demand forecast for products.
    
    Args:
        product_id: Optional specific product, otherwise forecasts all products
        forecast_date: Date to forecast for (defaults to next month)
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List of forecast records
    """
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    forecasts = generate_forecast(
        db=db,
        shop_id=current_user.shop_id,
        product_id=product_id,
        forecast_date=forecast_date
    )
    
    return {
        "forecasts": [
            {
                "id": str(f.id),
                "product_id": str(f.product_id) if f.product_id else None,
                "for_date": f.for_date.isoformat(),
                "forecast_qty": float(f.forecast_qty),
                "lower_bound": float(f.lower_bound) if f.lower_bound else None,
                "upper_bound": float(f.upper_bound) if f.upper_bound else None,
                "model_version": f.model_version
            }
            for f in forecasts
        ],
        "count": len(forecasts)
    }

