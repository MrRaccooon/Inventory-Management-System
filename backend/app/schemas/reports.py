"""
Reports schemas.
"""
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel
from datetime import date


class SalesVsProfitData(BaseModel):
    """Sales vs profit comparison data."""
    date: date
    sales: Decimal
    profit: Decimal


class CategoryDistributionData(BaseModel):
    """Category distribution data."""
    category_name: str
    sales_amount: Decimal
    percentage: float
    count: int


class DailySalesHeatmapData(BaseModel):
    """Daily sales heatmap data."""
    date: date
    sales: Decimal
    day_of_week: int
    week_number: int


class InventoryAgingData(BaseModel):
    """Inventory aging data."""
    product_id: str
    product_name: str
    days_in_stock: int
    quantity: int
    value: Decimal
    age_bucket: str  # 0-30, 31-60, 61-90, 90+


class EmployeeSalesData(BaseModel):
    """Employee sales performance data."""
    employee_id: str
    employee_name: str
    total_sales: Decimal
    total_profit: Decimal
    order_count: int
    avg_order_value: Decimal


class ReportResponse(BaseModel):
    """Complete report data."""
    sales_this_month: Decimal
    profit_this_month: Decimal
    monthly_growth: float
    top_categories: List[CategoryDistributionData]
    best_selling_product: dict
    worst_selling_product: dict
    sales_vs_profit: List[SalesVsProfitData]
    category_distribution: List[CategoryDistributionData]
    daily_sales_heatmap: List[DailySalesHeatmapData]
    inventory_aging: List[InventoryAgingData]
    top_employees: List[EmployeeSalesData]

