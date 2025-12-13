"""
Database session management.
Provides database session dependency for FastAPI routes.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

from app.config import settings

# Create database engine
# Note: SQLAlchemy 2.0 supports both psycopg2 and psycopg3
# The connection string format remains the same: postgresql://...
# psycopg3 is automatically detected and used if available
# Use psycopg3 driver if available, otherwise fallback to psycopg2
database_url = settings.DATABASE_URL
if database_url.startswith('postgresql://'):
    try:
        import psycopg
        # Use psycopg3 driver
        database_url = database_url.replace('postgresql://', 'postgresql+psycopg://', 1)
    except ImportError:
        # Fallback to default (will try psycopg2 if available)
        pass

engine = create_engine(
    database_url,
    pool_pre_ping=True,  # Verify connections before using
    pool_size=10,
    max_overflow=20,
    echo=settings.DEBUG,  # Log SQL queries in debug mode
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    Dependency function for FastAPI routes.
    Yields a database session and ensures it's closed after use.
    
    Usage:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

