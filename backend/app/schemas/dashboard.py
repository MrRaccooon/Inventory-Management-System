"""
Dashboard schemas.
"""
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel
from datetime import date


class KPICard(BaseModel):
    """KPI card data."""
    title: str
    value: str | Decimal | int
    change_percent: Optional[float] = None
    change_label: Optional[str] = None
    icon: Optional[str] = None


class SalesTrendPoint(BaseModel):
    """Single point in sales trend."""
    date: date
    sales: Decimal
    profit: Decimal


class CategorySalesData(BaseModel):
    """Category sales contribution."""
    category_name: str
    sales_amount: Decimal
    percentage: float


class AlertData(BaseModel):
    """Alert/notification data."""
    type: str
    message: str
    severity: str  # info, warning, error
    count: Optional[int] = None


class DashboardResponse(BaseModel):
    """Complete dashboard data."""
    kpi_cards: List[KPICard]
    sales_trend: List[SalesTrendPoint]
    profit_trend: List[SalesTrendPoint]
    category_sales: List[CategorySalesData]
    alerts: List[AlertData]
    top_selling_products: List[dict]
    date_range: dict

