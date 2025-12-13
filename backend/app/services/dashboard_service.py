"""
Dashboard service.
Aggregates data from multiple sources for dashboard display.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc
from uuid import UUID
from decimal import Decimal
from datetime import datetime, timedelta, date

from app.models.sales import Sale, invoice_status
from app.models.sale_item import SaleItem
from app.models.product import Product
from app.models.stock_movement import StockMovement
from app.utils.ledger import get_current_stock


def get_dashboard_data(
    db: Session,
    shop_id: UUID,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> dict:
    """
    Get complete dashboard data including KPIs, trends, and alerts.
    
    Args:
        db: Database session
        shop_id: Shop UUID
        start_date: Start date for data (defaults to 30 days ago)
        end_date: End date for data (defaults to today)
        
    Returns:
        Dictionary with all dashboard data
    """
    # Set default date range (last 30 days)
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    # Previous period for comparison
    period_days = (end_date - start_date).days
    prev_start_date = start_date - timedelta(days=period_days)
    prev_end_date = start_date
    
    # Get sales data
    sales_query = db.query(Sale).filter(
        and_(
            Sale.shop_id == shop_id,
            func.date(Sale.created_at) >= start_date,
            func.date(Sale.created_at) <= end_date,
            Sale.status != invoice_status.void
        )
    )
    
    current_sales = sales_query.all()
    current_total_sales = sum(sale.total_amount for sale in current_sales)
    current_total_profit = sum(sale.profit for sale in current_sales)
    current_order_count = len(current_sales)
    
    # Previous period sales
    prev_sales = db.query(Sale).filter(
        and_(
            Sale.shop_id == shop_id,
            func.date(Sale.created_at) >= prev_start_date,
            func.date(Sale.created_at) < prev_end_date,
            Sale.status != invoice_status.void
        )
    ).all()
    
    prev_total_sales = sum(sale.total_amount for sale in prev_sales)
    prev_order_count = len(prev_sales)
    
    # Calculate changes
    sales_change = (
        ((current_total_sales - prev_total_sales) / prev_total_sales * 100)
        if prev_total_sales > 0 else 0
    )
    orders_change = (
        ((current_order_count - prev_order_count) / prev_order_count * 100)
        if prev_order_count > 0 else 0
    )
    
    # Average orders per day
    avg_orders_per_day = current_order_count / period_days if period_days > 0 else 0
    
    # Top selling product
    top_product_result = db.query(
        SaleItem.product_id,
        Product.name,
        func.sum(SaleItem.quantity).label("total_qty")
    ).join(
        Product, SaleItem.product_id == Product.id
    ).join(
        Sale, SaleItem.sale_id == Sale.id
    ).filter(
        and_(
            Sale.shop_id == shop_id,
            func.date(Sale.created_at) >= start_date,
            func.date(Sale.created_at) <= end_date,
            Sale.status != invoice_status.void
        )
    ).group_by(
        SaleItem.product_id, Product.name
    ).order_by(
        desc("total_qty")
    ).first()
    
    top_product = top_product_result if top_product_result else (None, "N/A", 0)
    
    # Stock value
    products = db.query(Product).filter(Product.shop_id == shop_id).all()
    total_stock_value = sum(
        Decimal(str(get_current_stock(db, p.id, shop_id))) * p.cost_price
        for p in products
    )
    
    # Low stock items
    low_stock_items = [
        p for p in products
        if get_current_stock(db, p.id, shop_id) <= p.min_stock_threshold
        and get_current_stock(db, p.id, shop_id) > 0
    ]
    
    # Customer footfall (unique customers or total transactions)
    # Using transaction count as proxy for footfall
    customer_footfall = current_order_count
    
    # Previous week for comparison
    week_ago = end_date - timedelta(days=7)
    prev_week_sales = db.query(Sale).filter(
        and_(
            Sale.shop_id == shop_id,
            func.date(Sale.created_at) >= week_ago - timedelta(days=7),
            func.date(Sale.created_at) < week_ago,
            Sale.status != invoice_status.void
        )
    ).count()
    
    footfall_change = (
        ((customer_footfall - prev_week_sales) / prev_week_sales * 100)
        if prev_week_sales > 0 else 0
    )
    
    # Sales trend (daily)
    sales_trend = []
    profit_trend = []
    current_date = start_date
    while current_date <= end_date:
        day_sales = db.query(Sale).filter(
            and_(
                Sale.shop_id == shop_id,
                func.date(Sale.created_at) == current_date,
                Sale.status != invoice_status.void
            )
        ).all()
        
        day_total = sum(s.total_amount for s in day_sales)
        day_profit = sum(s.profit for s in day_sales)
        
        sales_trend.append({
            "date": current_date.isoformat(),
            "sales": float(day_total),
            "profit": float(day_profit)
        })
        
        profit_trend.append({
            "date": current_date.isoformat(),
            "profit": float(day_profit)
        })
        
        current_date += timedelta(days=1)
    
    # Category sales
    category_sales = db.query(
        Product.category_id,
        func.sum(SaleItem.line_total).label("total_sales")
    ).join(
        SaleItem, Product.id == SaleItem.product_id
    ).join(
        Sale, SaleItem.sale_id == Sale.id
    ).filter(
        and_(
            Sale.shop_id == shop_id,
            func.date(Sale.created_at) >= start_date,
            func.date(Sale.created_at) <= end_date,
            Sale.status != invoice_status.void
        )
    ).group_by(
        Product.category_id
    ).all()
    
    # Get alerts
    alerts = []
    
    # Low stock alerts
    if low_stock_items:
        alerts.append({
            "type": "low_stock",
            "message": f"{len(low_stock_items)} products are below stock threshold",
            "severity": "warning",
            "count": len(low_stock_items)
        })
    
    # Negative stock alerts
    negative_stock = [
        p for p in products
        if get_current_stock(db, p.id, shop_id) < 0
    ]
    if negative_stock:
        alerts.append({
            "type": "negative_stock",
            "message": f"{len(negative_stock)} products have negative stock",
            "severity": "error",
            "count": len(negative_stock)
        })
    
    # Top selling products
    top_selling = db.query(
        Product.name,
        func.sum(SaleItem.quantity).label("total_qty")
    ).join(
        SaleItem, Product.id == SaleItem.product_id
    ).join(
        Sale, SaleItem.sale_id == Sale.id
    ).filter(
        and_(
            Sale.shop_id == shop_id,
            func.date(Sale.created_at) >= start_date,
            func.date(Sale.created_at) <= end_date,
            Sale.status != invoice_status.void
        )
    ).group_by(
        Product.name
    ).order_by(
        desc("total_qty")
    ).limit(5).all()
    
    return {
        "kpi_cards": [
            {
                "title": "Total Sales",
                "value": float(current_total_sales),
                "change_percent": sales_change,
                "change_label": "vs last period"
            },
            {
                "title": "Net Profit",
                "value": float(current_total_profit),
                "change_percent": (
                    ((current_total_profit - sum(s.profit for s in prev_sales)) / sum(s.profit for s in prev_sales) * 100)
                    if prev_sales and sum(s.profit for s in prev_sales) > 0 else 0
                ),
                "change_label": "vs last period"
            },
            {
                "title": "Total Orders",
                "value": current_order_count,
                "change_percent": orders_change,
                "change_label": f"Avg {avg_orders_per_day:.1f}/day"
            },
            {
                "title": "Top Selling Product",
                "value": top_product[1] if top_product and top_product[0] else "N/A",
                "change_percent": None,
                "change_label": f"{int(top_product[2])} units" if top_product and top_product[0] else None
            },
            {
                "title": "Current Stock Value",
                "value": float(total_stock_value),
                "change_percent": None
            },
            {
                "title": "Low Stock Items",
                "value": len(low_stock_items),
                "change_percent": None,
                "severity": "warning" if low_stock_items else None
            },
            {
                "title": "Customer Footfall",
                "value": customer_footfall,
                "change_percent": footfall_change,
                "change_label": "vs last week"
            }
        ],
        "sales_trend": sales_trend,
        "profit_trend": profit_trend,
        "category_sales": [
            {
                "category_name": "Category",  # Would need to join with Category table
                "sales_amount": float(cs[1]),
                "percentage": float(cs[1] / current_total_sales * 100) if current_total_sales > 0 else 0
            }
            for cs in category_sales
        ],
        "alerts": alerts,
        "top_selling_products": [
            {"name": ts[0], "quantity": int(ts[1])}
            for ts in top_selling
        ],
        "date_range": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat()
        }
    }

