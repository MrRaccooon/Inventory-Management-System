"""
GST and billing schemas.
"""
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class GSTSummary(BaseModel):
    """GST summary data."""
    total_gst_collected: Decimal
    gst_payable: Decimal
    gst_input_credit: Decimal
    pending_bills: int
    completed_bills: int


class InvoiceResponse(BaseModel):
    """Invoice response schema."""
    id: UUID
    sale_id: Optional[UUID]
    invoice_no: Optional[str]
    pdf_url: Optional[str]
    created_at: datetime
    issued_by: Optional[UUID]
    
    class Config:
        from_attributes = True


class GSTReportItem(BaseModel):
    """GST report line item."""
    invoice_no: str
    date: datetime
    customer_name: Optional[str]
    base_amount: Decimal
    cgst: Decimal
    sgst: Decimal
    igst: Decimal
    total_gst: Decimal
    total_amount: Decimal
    gst_number: Optional[str]


class GSTReportResponse(BaseModel):
    """GST report response."""
    summary: GSTSummary
    invoices: List[InvoiceResponse]
    gst_items: List[GSTReportItem]
    period_start: datetime
    period_end: datetime

