# backend/app/models/invoices.py
import uuid
from sqlalchemy import Column, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy import TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey

from app.db.base import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    sale_id = Column(UUID(as_uuid=True), ForeignKey("sales.id"), nullable=True)
    invoice_no = Column(Text, nullable=True)
    pdf_url = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    issued_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    sale = relationship("Sale", back_populates="invoices")
    issued_by_user = relationship("User", back_populates="invoices_issued")
    # optionally link shop via sale.shop
    shop = relationship("Shop", viewonly=True, secondary="sales", primaryjoin="Invoice.sale_id==Sale.id", secondaryjoin="Sale.shop_id==Shop.id")
