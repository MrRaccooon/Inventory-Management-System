"""
Background worker for generating forecasts.
Uses Celery for asynchronous task processing.
"""
from celery import Celery
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import date

from app.config import settings
from app.db.session import SessionLocal
from app.services.ai_service import generate_forecast

# Initialize Celery app (if configured)
if settings.CELERY_BROKER_URL:
    celery_app = Celery(
        "inventory_ledger",
        broker=settings.CELERY_BROKER_URL,
        backend=settings.CELERY_RESULT_BACKEND
    )
    
    celery_app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
    )
else:
    celery_app = None


def get_db_session():
    """
    Get a database session for worker tasks.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@celery_app.task(name="generate_forecast_task")
def generate_forecast_task(shop_id: str, product_id: str = None, forecast_date: str = None):
    """
    Celery task to generate forecasts asynchronously.
    
    Args:
        shop_id: Shop UUID as string
        product_id: Optional product UUID as string
        forecast_date: Optional forecast date as ISO string
        
    Returns:
        Dictionary with forecast results
    """
    if not celery_app:
        # Fallback to synchronous execution if Celery not configured
        return generate_forecast_sync(shop_id, product_id, forecast_date)
    
    db = next(get_db_session())
    try:
        product_uuid = UUID(product_id) if product_id else None
        forecast_date_obj = date.fromisoformat(forecast_date) if forecast_date else None
        
        forecasts = generate_forecast(
            db=db,
            shop_id=UUID(shop_id),
            product_id=product_uuid,
            forecast_date=forecast_date_obj
        )
        
        return {
            "status": "success",
            "forecasts_count": len(forecasts),
            "forecasts": [
                {
                    "id": str(f.id),
                    "product_id": str(f.product_id) if f.product_id else None,
                    "for_date": f.for_date.isoformat(),
                    "forecast_qty": float(f.forecast_qty),
                }
                for f in forecasts
            ]
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }
    finally:
        db.close()


def generate_forecast_sync(shop_id: str, product_id: str = None, forecast_date: str = None):
    """
    Synchronous fallback for forecast generation.
    """
    db = next(get_db_session())
    try:
        product_uuid = UUID(product_id) if product_id else None
        forecast_date_obj = date.fromisoformat(forecast_date) if forecast_date else None
        
        forecasts = generate_forecast(
            db=db,
            shop_id=UUID(shop_id),
            product_id=product_uuid,
            forecast_date=forecast_date_obj
        )
        
        return {
            "status": "success",
            "forecasts_count": len(forecasts)
        }
    finally:
        db.close()

