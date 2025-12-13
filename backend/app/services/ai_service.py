"""
AI Analytics service.
Handles forecasting, predictions, and AI-powered insights.
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc
from uuid import UUID
from decimal import Decimal
from datetime import datetime, timedelta, date

from app.models.forecast import Forecast
from app.models.ai_insights_cache import AIInsightsCache
from app.models.sales import Sale, invoice_status
from app.models.sale_item import SaleItem
from app.models.product import Product
from app.utils.ledger import get_current_stock
from app.config import settings


def get_or_create_ai_insights(
    db: Session,
    shop_id: UUID,
    force_refresh: bool = False
) -> dict:
    """
    Get cached AI insights or generate new ones.
    
    Args:
        db: Database session
        shop_id: Shop UUID
        force_refresh: Force regeneration of insights
        
    Returns:
        Dictionary with AI insights
    """
    # Check cache
    if not force_refresh:
        cached = db.query(AIInsightsCache).filter(
            and_(
                AIInsightsCache.shop_id == shop_id,
                AIInsightsCache.insight_key == "main_insights",
                AIInsightsCache.expires_at > datetime.utcnow()
            )
        ).first()
        
        if cached:
            return cached.payload
    
    # Generate new insights
    insights = generate_ai_insights(db, shop_id)
    
    # Cache the insights
    cache_entry = AIInsightsCache(
        shop_id=shop_id,
        insight_key="main_insights",
        payload=insights,
        model_version=settings.FORECAST_MODEL_VERSION,
        expires_at=datetime.utcnow() + timedelta(hours=settings.AI_CACHE_TTL_HOURS)
    )
    
    db.add(cache_entry)
    db.commit()
    
    return insights


def generate_ai_insights(db: Session, shop_id: UUID) -> dict:
    """
    Generate AI insights based on sales data and trends.
    This is a simplified version - in production, you'd use ML models.
    
    Args:
        db: Database session
        shop_id: Shop UUID
        
    Returns:
        Dictionary with AI insights
    """
    # Get sales data for last 6 months
    lookback_date = date.today() - timedelta(days=settings.FORECAST_LOOKBACK_DAYS)
    
    sales = db.query(Sale).filter(
        and_(
            Sale.shop_id == shop_id,
            func.date(Sale.created_at) >= lookback_date,
            Sale.status != invoice_status.void
        )
    ).all()
    
    # Calculate predicted demand (simplified - average daily sales * 30)
    total_items_sold = db.query(
        func.sum(SaleItem.quantity)
    ).join(
        Sale, SaleItem.sale_id == Sale.id
    ).filter(
        and_(
            Sale.shop_id == shop_id,
            func.date(Sale.created_at) >= lookback_date,
            Sale.status != invoice_status.void
        )
    ).scalar() or 0
    
    days_in_period = (date.today() - lookback_date).days
    avg_daily_demand = total_items_sold / days_in_period if days_in_period > 0 else 0
    predicted_demand = avg_daily_demand * 30  # Next month
    
    # Expected revenue (average monthly revenue)
    total_revenue = sum(s.total_amount for s in sales)
    months_in_period = days_in_period / 30.0
    avg_monthly_revenue = total_revenue / months_in_period if months_in_period > 0 else 0
    expected_revenue = avg_monthly_revenue
    
    # Restock recommendations
    products = db.query(Product).filter(Product.shop_id == shop_id).all()
    restock_recommendations = []
    
    for product in products:
        current_stock = get_current_stock(db, product.id, shop_id)
        
        # Calculate average monthly sales for this product
        product_sales = db.query(
            func.sum(SaleItem.quantity)
        ).join(
            Sale, SaleItem.sale_id == Sale.id
        ).filter(
            and_(
                Sale.shop_id == shop_id,
                SaleItem.product_id == product.id,
                func.date(Sale.created_at) >= lookback_date,
                Sale.status != invoice_status.void
            )
        ).scalar() or 0
        
        avg_monthly_sales = (product_sales / months_in_period) if months_in_period > 0 else 0
        
        # Recommend restock if stock is low or will run out soon
        if current_stock <= product.min_stock_threshold:
            urgency = "critical" if current_stock == 0 else "high"
            recommended_qty = max(
                int(avg_monthly_sales * 1.5),  # 1.5 months supply
                product.reorder_qty
            )
            
            restock_recommendations.append({
                "product_id": str(product.id),
                "product_name": product.name,
                "current_stock": current_stock,
                "recommended_qty": recommended_qty,
                "urgency": urgency,
                "reason": f"Stock below threshold ({product.min_stock_threshold})"
            })
        elif current_stock <= avg_monthly_sales * 0.5:  # Less than 2 weeks supply
            restock_recommendations.append({
                "product_id": str(product.id),
                "product_name": product.name,
                "current_stock": current_stock,
                "recommended_qty": int(avg_monthly_sales * 1.5),
                "urgency": "medium",
                "reason": "Stock will run out soon based on sales trends"
            })
    
    # Expected stock outs
    expected_stock_outs = len([
        r for r in restock_recommendations
        if r["urgency"] == "critical"
    ])
    
    # Slow moving items (no sales in last 60 days)
    slow_moving_threshold = date.today() - timedelta(days=60)
    slow_moving_items = []
    
    for product in products:
        last_sale = db.query(SaleItem).join(
            Sale, SaleItem.sale_id == Sale.id
        ).filter(
            and_(
                Sale.shop_id == shop_id,
                SaleItem.product_id == product.id,
                Sale.status != invoice_status.void
            )
        ).order_by(
            desc(Sale.created_at)
        ).first()
        
        if not last_sale or last_sale.sale.created_at.date() < slow_moving_threshold:
            slow_moving_items.append({
                "product_id": str(product.id),
                "product_name": product.name,
                "sales_trend": "stagnant",
                "last_sale_date": last_sale.sale.created_at.date().isoformat() if last_sale else None,
                "recommendation": "Consider discounting or removing from inventory"
            })
    
    # High risk items (high stock, low sales)
    high_risk_items = []
    for product in products:
        current_stock = get_current_stock(db, product.id, shop_id)
        stock_value = Decimal(str(current_stock)) * product.cost_price
        
        if current_stock > 0:
            months_of_supply = (
                (current_stock / avg_monthly_sales) if avg_monthly_sales > 0 else 999
            )
            
            if months_of_supply > 6:  # More than 6 months supply
                high_risk_items.append({
                    "product_id": str(product.id),
                    "product_name": product.name,
                    "current_stock": current_stock,
                    "months_of_supply": months_of_supply,
                    "stock_value": float(stock_value)
                })
    
    # Seasonal insights (simplified - would use actual seasonal data)
    seasonal_insights = []
    # This would be enhanced with actual seasonal analysis
    
    # Price optimizations (simplified)
    price_optimizations = []
    # This would use price elasticity analysis
    
    # Declining interest
    declining_interest = slow_moving_items[:10]  # Top 10 slow moving
    
    return {
        "predicted_demand": float(predicted_demand),
        "expected_revenue": float(expected_revenue),
        "expected_stock_outs": expected_stock_outs,
        "slow_moving_items": len(slow_moving_items),
        "high_risk_items": len(high_risk_items),
        "restock_recommendations": restock_recommendations,
        "seasonal_insights": seasonal_insights,
        "price_optimizations": price_optimizations,
        "declining_interest": declining_interest,
        "model_version": settings.FORECAST_MODEL_VERSION,
        "last_updated": datetime.utcnow().isoformat()
    }


def generate_forecast(
    db: Session,
    shop_id: UUID,
    product_id: Optional[UUID] = None,
    forecast_date: Optional[date] = None
) -> List[Forecast]:
    """
    Generate demand forecast for products.
    
    Args:
        db: Database session
        shop_id: Shop UUID
        product_id: Optional specific product, otherwise all products
        forecast_date: Date to forecast for (defaults to next month)
        
    Returns:
        List of Forecast objects
    """
    if not forecast_date:
        forecast_date = date.today() + timedelta(days=30)
    
    products_to_forecast = [db.query(Product).filter(Product.id == product_id).first()] if product_id else \
        db.query(Product).filter(Product.shop_id == shop_id).all()
    
    forecasts = []
    lookback_date = date.today() - timedelta(days=settings.FORECAST_LOOKBACK_DAYS)
    
    for product in products_to_forecast:
        # Calculate average daily sales
        total_sold = db.query(
            func.sum(SaleItem.quantity)
        ).join(
            Sale, SaleItem.sale_id == Sale.id
        ).filter(
            and_(
                Sale.shop_id == shop_id,
                SaleItem.product_id == product.id,
                func.date(Sale.created_at) >= lookback_date,
                Sale.status != invoice_status.void
            )
        ).scalar() or 0
        
        days_in_period = (date.today() - lookback_date).days
        avg_daily = total_sold / days_in_period if days_in_period > 0 else 0
        
        # Simple forecast: average daily * days until forecast date
        days_until = (forecast_date - date.today()).days
        forecast_qty = avg_daily * days_until
        
        # Confidence bounds (simplified)
        lower_bound = forecast_qty * 0.8
        upper_bound = forecast_qty * 1.2
        
        forecast = Forecast(
            shop_id=shop_id,
            product_id=product.id,
            for_date=forecast_date,
            forecast_qty=forecast_qty,
            lower_bound=lower_bound,
            upper_bound=upper_bound,
            model_version=settings.FORECAST_MODEL_VERSION
        )
        
        db.add(forecast)
        forecasts.append(forecast)
    
    db.commit()
    return forecasts

