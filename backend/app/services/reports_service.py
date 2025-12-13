"""
Reports service.
Generates comprehensive reports for sales, inventory, and performance analysis.
"""
from typing import Optional
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
from app.utils.ledger import get_current_stock


def get_reports_data(
    db: Session,
    shop_id: UUID,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> dict:
    """
    Get complete reports data.
    
    Args:
        db: Database session
        shop_id: Shop UUID
        start_date: Start date (defaults to start of current month)
        end_date: End date (defaults to today)
        
    Returns:
        Dictionary with all report data
    """
    # Set default date range (current month)
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = date.today().replace(day=1)
    
    # Previous month for comparison
    if start_date.month == 1:
        prev_start = date(start_date.year - 1, 12, 1)
        prev_end = date(start_date.year - 1, 12, 31)
    else:
        prev_start = date(start_date.year, start_date.month - 1, 1)
        prev_end = date(start_date.year, start_date.month - 1, 28)  # Approximate
    
    # Get sales for current period
    current_sales = db.query(Sale).filter(
        and_(
            Sale.shop_id == shop_id,
            func.date(Sale.created_at) >= start_date,
            func.date(Sale.created_at) <= end_date,
            Sale.status != invoice_status.void
        )
    ).all()
    
    sales_this_month = sum(s.total_amount for s in current_sales)
    profit_this_month = sum(s.profit for s in current_sales)
    
    # Previous month sales
    prev_sales = db.query(Sale).filter(
        and_(
            Sale.shop_id == shop_id,
            func.date(Sale.created_at) >= prev_start,
            func.date(Sale.created_at) <= prev_end,
            Sale.status != invoice_status.void
        )
    ).all()
    
    prev_sales_total = sum(s.total_amount for s in prev_sales)
    monthly_growth = (
        ((sales_this_month - prev_sales_total) / prev_sales_total * 100)
        if prev_sales_total > 0 else 0
    )
    
    # Top 3 categories
    category_sales = db.query(
        Category.name,
        func.sum(SaleItem.line_total).label("total_sales")
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
    ).order_by(
        desc("total_sales")
    ).limit(3).all()
    
    # Best and worst selling products
    product_sales = db.query(
        Product.name,
        func.sum(SaleItem.quantity).label("total_qty"),
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
        Product.name
    ).order_by(
        desc("total_qty")
    ).all()
    
    best_selling = product_sales[0] if product_sales else None
    worst_selling = product_sales[-1] if product_sales else None
    
    # Sales vs Profit comparison
    sales_vs_profit = []
    current_date = start_date
    while current_date <= end_date:
        day_sales = db.query(Sale).filter(
            and_(
                Sale.shop_id == shop_id,
                func.date(Sale.created_at) == current_date,
                Sale.status != invoice_status.void
            )
        ).all()
        
        day_sales_total = sum(s.total_amount for s in day_sales)
        day_profit = sum(s.profit for s in day_sales)
        
        sales_vs_profit.append({
            "date": current_date.isoformat(),
            "sales": float(day_sales_total),
            "profit": float(day_profit)
        })
        
        current_date += timedelta(days=1)
    
    # Category distribution
    all_category_sales = db.query(
        Category.name,
        func.sum(SaleItem.line_total).label("total_sales"),
        func.count(SaleItem.id).label("item_count")
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
    
    category_distribution = [
        {
            "category_name": cs[0],
            "sales_amount": float(cs[1]),
            "percentage": float(cs[1] / sales_this_month * 100) if sales_this_month > 0 else 0,
            "count": int(cs[2])
        }
        for cs in all_category_sales
    ]
    
    # Daily sales heatmap (last 4 weeks)
    heatmap_start = end_date - timedelta(days=28)
    daily_heatmap = []
    current_date = heatmap_start
    while current_date <= end_date:
        day_sales = db.query(Sale).filter(
            and_(
                Sale.shop_id == shop_id,
                func.date(Sale.created_at) == current_date,
                Sale.status != invoice_status.void
            )
        ).all()
        
        day_total = sum(s.total_amount for s in day_sales)
        
        daily_heatmap.append({
            "date": current_date.isoformat(),
            "sales": float(day_total),
            "day_of_week": current_date.weekday(),
            "week_number": current_date.isocalendar()[1]
        })
        
        current_date += timedelta(days=1)
    
    # Inventory aging
    products = db.query(Product).filter(Product.shop_id == shop_id).all()
    inventory_aging = []
    
    for product in products:
        stock = get_current_stock(db, product.id, shop_id)
        if stock > 0:
            # Get last movement date (simplified - would need more complex query)
            # For now, use created_at as proxy
            days_in_stock = (date.today() - product.created_at.date()).days
            
            if days_in_stock <= 30:
                age_bucket = "0-30"
            elif days_in_stock <= 60:
                age_bucket = "31-60"
            elif days_in_stock <= 90:
                age_bucket = "61-90"
            else:
                age_bucket = "90+"
            
            value = Decimal(str(stock)) * product.cost_price
            
            inventory_aging.append({
                "product_id": str(product.id),
                "product_name": product.name,
                "days_in_stock": days_in_stock,
                "quantity": stock,
                "value": float(value),
                "age_bucket": age_bucket
            })
    
    # Top employees by sales
    employee_sales = db.query(
        User.id,
        User.name,
        func.sum(Sale.total_amount).label("total_sales"),
        func.sum(Sale.profit).label("total_profit"),
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
        desc("total_sales")
    ).all()
    
    top_employees = [
        {
            "employee_id": str(es[0]),
            "employee_name": es[1],
            "total_sales": float(es[2]),
            "total_profit": float(es[3]),
            "order_count": int(es[4]),
            "avg_order_value": float(es[2] / es[4]) if es[4] > 0 else 0
        }
        for es in employee_sales
    ]
    
    return {
        "sales_this_month": float(sales_this_month),
        "profit_this_month": float(profit_this_month),
        "monthly_growth": monthly_growth,
        "top_categories": [
            {
                "category_name": cs[0],
                "sales_amount": float(cs[1]),
                "percentage": float(cs[1] / sales_this_month * 100) if sales_this_month > 0 else 0,
                "count": 0
            }
            for cs in category_sales
        ],
        "best_selling_product": {
            "name": best_selling[0],
            "quantity": int(best_selling[1]),
            "sales": float(best_selling[2])
        } if best_selling else {},
        "worst_selling_product": {
            "name": worst_selling[0],
            "quantity": int(worst_selling[1]),
            "sales": float(worst_selling[2])
        } if worst_selling else {},
        "sales_vs_profit": sales_vs_profit,
        "category_distribution": category_distribution,
        "daily_sales_heatmap": daily_heatmap,
        "inventory_aging": inventory_aging,
        "top_employees": top_employees
    }

