"""
Profitability analysis service.
Analyzes profit margins, trends, and identifies loss-making items.
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc
from uuid import UUID
from decimal import Decimal
from datetime import datetime, timedelta, date

from app.models.sales import Sale, invoice_status
from app.models.sale_item import SaleItem
from app.models.product import Product
from app.models.categories import Category
from app.models.user import User


def get_profitability_analysis(
    db: Session,
    shop_id: UUID,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> dict:
    """
    Get complete profitability analysis.
    
    Args:
        db: Database session
        shop_id: Shop UUID
        start_date: Start date (defaults to start of current month)
        end_date: End date (defaults to today)
        
    Returns:
        Dictionary with profitability analysis
    """
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = date.today().replace(day=1)
    
    # Get sales in period
    sales = db.query(Sale).filter(
        and_(
            Sale.shop_id == shop_id,
            func.date(Sale.created_at) >= start_date,
            func.date(Sale.created_at) <= end_date,
            Sale.status != invoice_status.void
        )
    ).all()
    
    gross_profit = sum(s.profit for s in sales)
    total_sales = sum(s.total_amount for s in sales)
    total_cost = sum(s.total_cost for s in sales)
    
    # Net profit (gross profit - expenses, simplified)
    net_profit = gross_profit  # Would subtract expenses in real scenario
    profit_margin = (net_profit / total_sales * 100) if total_sales > 0 else 0
    
    # Most and least profitable items
    item_profitability = db.query(
        Product.id,
        Product.name,
        func.sum(SaleItem.line_total - (SaleItem.quantity * SaleItem.unit_cost)).label("total_profit"),
        func.sum(SaleItem.line_total).label("total_sales"),
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
        Product.id, Product.name
    ).order_by(
        desc("total_profit")
    ).all()
    
    most_profitable = [
        {
            "product_id": str(ip[0]),
            "product_name": ip[1],
            "total_profit": float(ip[2]),
            "total_sales": float(ip[3]),
            "quantity": int(ip[4]),
            "margin": float((ip[2] / ip[3] * 100) if ip[3] > 0 else 0)
        }
        for ip in item_profitability[:10]  # Top 10
    ]
    
    least_profitable = [
        {
            "product_id": str(ip[0]),
            "product_name": ip[1],
            "total_profit": float(ip[2]),
            "total_sales": float(ip[3]),
            "quantity": int(ip[4]),
            "margin": float((ip[2] / ip[3] * 100) if ip[3] > 0 else 0)
        }
        for ip in item_profitability[-10:]  # Bottom 10
    ]
    
    # Profit trend (6 months)
    profit_trend = []
    for i in range(6):
        month_date = end_date.replace(day=1) - timedelta(days=30 * i)
        month_start = month_date
        month_end = (month_date + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        
        month_sales = db.query(Sale).filter(
            and_(
                Sale.shop_id == shop_id,
                func.date(Sale.created_at) >= month_start,
                func.date(Sale.created_at) <= month_end,
                Sale.status != invoice_status.void
            )
        ).all()
        
        month_gross = sum(s.profit for s in month_sales)
        month_total = sum(s.total_amount for s in month_sales)
        month_margin = (month_gross / month_total * 100) if month_total > 0 else 0
        
        profit_trend.append({
            "date": month_start.isoformat(),
            "gross_profit": float(month_gross),
            "net_profit": float(month_gross),  # Simplified
            "profit_margin": month_margin
        })
    
    profit_trend.reverse()  # Oldest first
    
    # Profit by category
    category_profit = db.query(
        Category.name,
        func.sum(SaleItem.line_total - (SaleItem.quantity * SaleItem.unit_cost)).label("total_profit"),
        func.sum(SaleItem.line_total).label("total_sales"),
        func.count(Product.id.distinct()).label("item_count")
    ).join(
        Product, Category.id == Product.category_id
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
        Category.name
    ).all()
    
    profit_by_category = [
        {
            "category_name": cp[0],
            "total_profit": float(cp[1]),
            "total_sales": float(cp[2]),
            "margin_percentage": float((cp[1] / cp[2] * 100) if cp[2] > 0 else 0),
            "item_count": int(cp[3])
        }
        for cp in category_profit
    ]
    
    # Margin comparison (by product category)
    margin_comparison = profit_by_category
    
    # Loss-making items
    loss_making = []
    for item in item_profitability:
        if item[2] < 0:  # Negative profit
            product = db.query(Product).filter(Product.id == item[0]).first()
            category = db.query(Category).filter(Category.id == product.category_id).first() if product else None
            
            loss_making.append({
                "product_id": str(item[0]),
                "product_name": item[1],
                "category": category.name if category else None,
                "cost_price": float(product.cost_price) if product else 0,
                "sold_price": float(item[3] / item[4]) if item[4] > 0 else 0,  # Average selling price
                "loss": float(item[2]),
                "quantity_sold": int(item[4]),
                "status": "clearance"  # Would determine based on context
            })
    
    # Profit by employee
    employee_profit = db.query(
        User.id,
        User.name,
        func.sum(Sale.profit).label("total_profit"),
        func.sum(Sale.total_amount).label("total_sales"),
        func.count(Sale.id).label("order_count")
    ).join(
        Sale, User.id == Sale.created_by
    ).filter(
        and_(
            Sale.shop_id == shop_id,
            func.date(Sale.created_at) >= start_date,
            func.date(Sale.created_at) <= end_date,
            Sale.status != invoice_status.void
        )
    ).group_by(
        User.id, User.name
    ).order_by(
        desc("total_profit")
    ).all()
    
    profit_by_employee = [
        {
            "employee_id": str(ep[0]),
            "employee_name": ep[1],
            "total_profit": float(ep[2]),
            "total_sales": float(ep[3]),
            "margin_percentage": float((ep[2] / ep[3] * 100) if ep[3] > 0 else 0),
            "order_count": int(ep[4])
        }
        for ep in employee_profit
    ]
    
    return {
        "gross_profit": float(gross_profit),
        "net_profit": float(net_profit),
        "profit_margin": profit_margin,
        "most_profitable_items": most_profitable,
        "least_profitable_items": least_profitable,
        "profit_trend": profit_trend,
        "profit_by_category": profit_by_category,
        "margin_comparison": margin_comparison,
        "loss_making_items": loss_making,
        "profit_by_employee": profit_by_employee
    }

