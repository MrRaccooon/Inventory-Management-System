# backend/app/models/forecasts.py
import uuid
from sqlalchemy import Column, Date, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy import TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey, Text

from app.db.base import Base


class Forecast(Base):
    __tablename__ = "forecasts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    shop_id = Column(UUID(as_uuid=True), ForeignKey("shops.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=True)
    for_date = Column(Date, nullable=False)
    forecast_qty = Column(Numeric, nullable=False, server_default=text("0"))
    lower_bound = Column(Numeric, nullable=True)
    upper_bound = Column(Numeric, nullable=True)
    model_version = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    product = relationship("Product", back_populates="forecasts")
    shop = relationship("Shop", back_populates="forecasts")
