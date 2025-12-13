"""
AI Analytics schemas.
"""
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel
from datetime import date


class ForecastData(BaseModel):
    """Forecast data for a product."""
    product_id: str
    product_name: str
    for_date: date
    forecast_qty: Decimal
    lower_bound: Optional[Decimal] = None
    upper_bound: Optional[Decimal] = None
    confidence: Optional[float] = None


class RestockRecommendation(BaseModel):
    """Product restock recommendation."""
    product_id: str
    product_name: str
    current_stock: int
    recommended_qty: int
    urgency: str  # low, medium, high, critical
    reason: str


class SeasonalInsight(BaseModel):
    """Seasonal demand insight."""
    product_id: str
    product_name: str
    expected_demand_increase: float
    season: str
    recommendation: str


class PriceOptimization(BaseModel):
    """Price optimization suggestion."""
    product_id: str
    product_name: str
    current_price: Decimal
    suggested_price: Decimal
    expected_revenue_change: float
    reason: str


class DecliningInterest(BaseModel):
    """Product with declining interest."""
    product_id: str
    product_name: str
    sales_trend: str  # declining, stagnant
    last_sale_date: Optional[date] = None
    recommendation: str


class AIAnalyticsResponse(BaseModel):
    """Complete AI analytics response."""
    predicted_demand: Decimal
    expected_revenue: Decimal
    expected_stock_outs: int
    slow_moving_items: int
    high_risk_items: int
    restock_recommendations: List[RestockRecommendation]
    seasonal_insights: List[SeasonalInsight]
    price_optimizations: List[PriceOptimization]
    declining_interest: List[DecliningInterest]
    model_version: str
    last_updated: str

