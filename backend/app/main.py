"""
Main FastAPI application.
Sets up the application with all routers, middleware, and configuration.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from app.config import settings
from app.db.base import Base
from app.db.session import engine

# Import all routers
from app.api.v1 import (
    auth,
    dashboard,
    products,
    sales,
    gst,
    ai_analytics,
    reports,
    employees,
    profit,
    invoices
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    """
    # Startup: Create database tables (in production, use Alembic migrations)
    # Base.metadata.create_all(bind=engine)
    
    yield
    
    # Shutdown: Cleanup if needed
    pass


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="InventoryLedger CRM - Enterprise Inventory & Sales Management System",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """
    Global exception handler for unhandled errors.
    """
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "message": str(exc) if settings.DEBUG else "An unexpected error occurred"
        }
    )


# Health check endpoint
@app.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring.
    """
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION
    }


# Include API routers
app.include_router(
    auth.router,
    prefix="/api/v1/auth",
    tags=["Authentication"]
)

app.include_router(
    dashboard.router,
    prefix="/api/v1/dashboard",
    tags=["Dashboard"]
)

app.include_router(
    products.router,
    prefix="/api/v1/products",
    tags=["Products & Inventory"]
)

app.include_router(
    sales.router,
    prefix="/api/v1/sales",
    tags=["Sales"]
)

app.include_router(
    gst.router,
    prefix="/api/v1/gst",
    tags=["GST & Billing"]
)

app.include_router(
    ai_analytics.router,
    prefix="/api/v1/ai-analytics",
    tags=["AI Analytics"]
)

app.include_router(
    reports.router,
    prefix="/api/v1/reports",
    tags=["Reports"]
)

app.include_router(
    employees.router,
    prefix="/api/v1/employees",
    tags=["Employees"]
)

app.include_router(
    profit.router,
    prefix="/api/v1/profitability",
    tags=["Profitability"]
)

app.include_router(
    invoices.router,
    prefix="/api/v1/invoices",
    tags=["Invoices"]
)


# Root endpoint
@app.get("/")
async def root():
    """
    Root endpoint with API information.
    """
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health"
    }

