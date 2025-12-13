"""
Database models package.
Imports all models so SQLAlchemy can discover them.
"""
from app.models.shop import Shop
from app.models.user import User
from app.models.categories import Category
from app.models.product import Product
from app.models.sales import Sale
from app.models.sale_item import SaleItem
from app.models.stock_movement import StockMovement
from app.models.invoices import Invoice
from app.models.forecast import Forecast
from app.models.ai_insights_cache import AIInsightsCache
from app.models.notifications import Notification
from app.models.audit_logs import AuditLog
from app.models.employee_attendance import EmployeeAttendance

__all__ = [
    "Shop",
    "User",
    "Category",
    "Product",
    "Sale",
    "SaleItem",
    "StockMovement",
    "Invoice",
    "Forecast",
    "AIInsightsCache",
    "Notification",
    "AuditLog",
    "EmployeeAttendance",
]

