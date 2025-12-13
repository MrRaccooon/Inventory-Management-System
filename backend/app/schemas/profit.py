"""
Profitability analysis schemas.
"""
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel
from datetime import date


class ProfitTrendPoint(BaseModel):
    """Single point in profit trend."""
    date: date
    gross_profit: Decimal
    net_profit: Decimal
    profit_margin: float


class ProfitByCategory(BaseModel):
    """Profit breakdown by category."""
    category_name: str
    total_profit: Decimal
    total_sales: Decimal
    margin_percentage: float
    item_count: int


class LossMakingItem(BaseModel):
    """Item that is making a loss."""
    product_id: str
    product_name: str
    category: Optional[str]
    cost_price: Decimal
    sold_price: Decimal
    loss: Decimal
    quantity_sold: int
    status: str  # clearance, damaged, etc.


class EmployeeProfit(BaseModel):
    """Employee profit contribution."""
    employee_id: str
    employee_name: str
    total_profit: Decimal
    total_sales: Decimal
    margin_percentage: float
    order_count: int


class ProfitabilityResponse(BaseModel):
    """Complete profitability analysis."""
    gross_profit: Decimal
    net_profit: Decimal
    profit_margin: float
    most_profitable_items: List[dict]
    least_profitable_items: List[dict]
    profit_trend: List[ProfitTrendPoint]
    profit_by_category: List[ProfitByCategory]
    margin_comparison: List[dict]
    loss_making_items: List[LossMakingItem]
    profit_by_employee: List[EmployeeProfit]

