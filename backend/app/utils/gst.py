"""
GST (Goods and Services Tax) calculation utilities for India.
Handles GST breakdown, tax calculations, and invoice generation.
"""
from decimal import Decimal
from typing import Dict, Optional
from enum import Enum


class GSTSlab(Enum):
    """GST tax slabs in India."""
    ZERO = 0.0
    FIVE = 5.0
    TWELVE = 12.0
    EIGHTEEN = 18.0
    TWENTY_EIGHT = 28.0


def calculate_gst(
    amount: Decimal,
    gst_rate: float = 18.0,
    is_inclusive: bool = False
) -> Dict[str, Decimal]:
    """
    Calculate GST breakdown for an amount.
    
    Args:
        amount: Base amount or total amount (if inclusive)
        gst_rate: GST rate percentage (default 18%)
        is_inclusive: Whether GST is included in the amount
        
    Returns:
        Dictionary with:
        - base_amount: Amount before GST
        - cgst: Central GST (half of total GST)
        - sgst: State GST (half of total GST)
        - igst: Integrated GST (for inter-state, same as total GST)
        - total_gst: Total GST amount
        - total_amount: Final amount including GST
    """
    gst_rate_decimal = Decimal(str(gst_rate)) / Decimal("100")
    
    if is_inclusive:
        # GST is included in the amount
        base_amount = amount / (Decimal("1") + gst_rate_decimal)
        total_gst = amount - base_amount
    else:
        # GST is added to the amount
        base_amount = amount
        total_gst = base_amount * gst_rate_decimal
    
    # Split GST into CGST and SGST (for intra-state)
    # For inter-state, use IGST instead
    cgst = total_gst / Decimal("2")
    sgst = total_gst / Decimal("2")
    igst = total_gst
    
    total_amount = base_amount + total_gst
    
    return {
        "base_amount": round(base_amount, 2),
        "cgst": round(cgst, 2),
        "sgst": round(sgst, 2),
        "igst": round(igst, 2),
        "total_gst": round(total_gst, 2),
        "total_amount": round(total_amount, 2),
        "gst_rate": gst_rate,
    }


def calculate_line_item_gst(
    quantity: int,
    unit_price: Decimal,
    discount: Decimal = Decimal("0"),
    gst_rate: float = 18.0
) -> Dict[str, Decimal]:
    """
    Calculate GST for a line item (product in sale).
    
    Args:
        quantity: Quantity of items
        unit_price: Price per unit
        discount: Discount amount
        gst_rate: GST rate percentage
        
    Returns:
        Dictionary with GST breakdown and line totals
    """
    subtotal = Decimal(str(quantity)) * unit_price
    discounted_amount = subtotal - discount
    
    gst_breakdown = calculate_gst(discounted_amount, gst_rate, is_inclusive=False)
    
    return {
        **gst_breakdown,
        "quantity": quantity,
        "unit_price": unit_price,
        "subtotal": round(subtotal, 2),
        "discount": discount,
        "line_total": round(gst_breakdown["total_amount"], 2),
    }


def aggregate_gst_breakdown(line_items: list[Dict]) -> Dict[str, Decimal]:
    """
    Aggregate GST breakdown from multiple line items.
    
    Args:
        line_items: List of line item GST breakdowns
        
    Returns:
        Aggregated GST breakdown
    """
    total_base = Decimal("0")
    total_cgst = Decimal("0")
    total_sgst = Decimal("0")
    total_igst = Decimal("0")
    total_gst = Decimal("0")
    total_amount = Decimal("0")
    
    for item in line_items:
        total_base += Decimal(str(item.get("base_amount", 0)))
        total_cgst += Decimal(str(item.get("cgst", 0)))
        total_sgst += Decimal(str(item.get("sgst", 0)))
        total_igst += Decimal(str(item.get("igst", 0)))
        total_gst += Decimal(str(item.get("total_gst", 0)))
        total_amount += Decimal(str(item.get("total_amount", 0)))
    
    return {
        "base_amount": round(total_base, 2),
        "cgst": round(total_cgst, 2),
        "sgst": round(total_sgst, 2),
        "igst": round(total_igst, 2),
        "total_gst": round(total_gst, 2),
        "total_amount": round(total_amount, 2),
    }


def format_gst_number(gst_number: Optional[str]) -> Optional[str]:
    """
    Validate and format GST number (15 characters, alphanumeric).
    
    Args:
        gst_number: Raw GST number string
        
    Returns:
        Formatted GST number or None if invalid
    """
    if not gst_number:
        return None
    
    # Remove spaces and convert to uppercase
    formatted = gst_number.replace(" ", "").upper()
    
    # Basic validation: 15 characters, alphanumeric
    if len(formatted) == 15 and formatted.isalnum():
        return formatted
    
    return None

