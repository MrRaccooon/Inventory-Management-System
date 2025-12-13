"""
Application configuration settings.
Loads environment variables and sets up configuration for the FastAPI application.
"""
import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "InventoryLedger CRM"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/inventory_ledger"
    )
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # JWT Authentication
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # CORS
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:5173"
    )
    
    @property
    def cors_origins_list(self) -> list[str]:
        """Get CORS origins as a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
    
    # File Upload
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    
    # GST Configuration (India)
    DEFAULT_GST_RATE: float = 18.0  # Default GST rate in percentage
    
    # AI/ML Configuration
    FORECAST_MODEL_VERSION: str = "1.0"
    FORECAST_LOOKBACK_DAYS: int = 180  # 6 months
    AI_CACHE_TTL_HOURS: int = 24
    
    # Background Workers
    CELERY_BROKER_URL: Optional[str] = os.getenv("CELERY_BROKER_URL", None)
    CELERY_RESULT_BACKEND: Optional[str] = os.getenv("CELERY_RESULT_BACKEND", None)
    
    # Invoice/PDF Generation
    INVOICE_PDF_DIR: str = os.getenv("INVOICE_PDF_DIR", "./invoices")
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()

