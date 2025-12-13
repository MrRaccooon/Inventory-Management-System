# This file makes the v1 directory a package and can import routers
from . import (
    auth,
    dashboard,
    products,
    sales,
    gst,
    ai_analytics,
    reports,
    employees,
    profit,
    invoices,
    shops,
    categories,
    notifications,
    customers,
    suppliers,
    search
)

__all__ = [
    "auth",
    "dashboard",
    "products",
    "sales",
    "gst",
    "ai_analytics",
    "reports",
    "employees",
    "profit",
    "invoices",
    "shops",
    "categories",
    "notifications",
    "customers",
    "suppliers",
    "search"
]
