"""
SQLAlchemy base class for all models.
All database models should inherit from this Base class.
"""
from sqlalchemy.ext.declarative import declarative_base

# Create the base class for all models
Base = declarative_base()

