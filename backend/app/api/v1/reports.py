"""
Reports API endpoints.
Provides comprehensive reports for sales, inventory, and performance.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date

from app.db.session import get_db
from app.models.user import User
from app.utils.auth import get_current_active_user
from app.services.reports_service import get_reports_data
from app.schemas.reports import ReportResponse

router = APIRouter()


@router.get("", response_model=ReportResponse)
async def get_reports(
    start_date: Optional[date] = Query(None, description="Start date (defaults to start of current month)"),
    end_date: Optional[date] = Query(None, description="End date (defaults to today)"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive reports data.
    
    Args:
        start_date: Start date for report data
        end_date: End date for report data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Complete report data including sales, profit, categories, inventory, and employees
    """
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    report_data = get_reports_data(
        db=db,
        shop_id=current_user.shop_id,
        start_date=start_date,
        end_date=end_date
    )
    
    return report_data


@router.get("/export/excel")
async def export_report_excel(
    start_date: Optional[date] = Query(None, description="Start date"),
    end_date: Optional[date] = Query(None, description="End date"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Export comprehensive report as Excel file.
    
    Args:
        start_date: Start date
        end_date: End date
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Excel file download
    """
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    # Generate report data
    report_data = generate_comprehensive_report(
        db=db,
        shop_id=current_user.shop_id,
        start_date=start_date,
        end_date=end_date
    )
    
    # Create Excel workbook
    wb = Workbook()
    
    # Summary Sheet
    ws_summary = wb.active
    ws_summary.title = "Summary"
    
    # Headers
    headers = ["Metric", "Value"]
    for col, header in enumerate(headers, 1):
        cell = ws_summary.cell(row=1, column=col, value=header)
        cell.font = Font(bold=True)
        cell.fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
        cell.alignment = Alignment(horizontal="center")
    
    # Summary data
    summary = report_data.get("summary", {})
    row = 2
    for key, value in summary.items():
        ws_summary.cell(row=row, column=1, value=key.replace("_", " ").title())
        ws_summary.cell(row=row, column=2, value=value)
        row += 1
    
    # Sales Sheet (if available)
    sales = report_data.get("sales", {}).get("items", [])
    if sales:
        ws_sales = wb.create_sheet("Sales")
        ws_sales.append(["Invoice No", "Date", "Total Amount", "Payment Type", "Status"])
        for sale in sales[:1000]:  # Limit to 1000 rows
            ws_sales.append([
                sale.get("invoice_no"),
                str(sale.get("created_at")),
                float(sale.get("total_amount", 0)),
                sale.get("payment_type"),
                sale.get("status")
            ])
    
    # Save to BytesIO
    excel_file = io.BytesIO()
    wb.save(excel_file)
    excel_file.seek(0)
    
    filename = f"report_{start_date or 'all'}_{end_date or 'all'}.xlsx"
    
    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/csv")
async def export_report_csv(
    report_type: str = Query("sales", description="Report type: sales, products, inventory"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Export report as CSV file.
    
    Args:
        report_type: Type of report to export
        start_date: Start date
        end_date: End date
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        CSV file download
    """
    from app.models.sales import Sale
    from app.models.product import Product
    
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    csv_buffer = io.StringIO()
    
    if report_type == "sales":
        query = db.query(Sale).filter(Sale.shop_id == current_user.shop_id)
        if start_date:
            query = query.filter(Sale.created_at >= start_date)
        if end_date:
            query = query.filter(Sale.created_at <= end_date)
        
        sales = query.all()
        
        # Create DataFrame
        data = [{
            "invoice_no": s.invoice_no,
            "date": s.created_at,
            "total_amount": float(s.total_amount),
            "payment_type": s.payment_type,
            "status": s.status,
            "profit": float(s.profit)
        } for s in sales]
        
        df = pd.DataFrame(data)
        df.to_csv(csv_buffer, index=False)
        
    elif report_type == "products":
        products = db.query(Product).filter(Product.shop_id == current_user.shop_id).all()
        
        data = [{
            "name": p.name,
            "sku": p.sku,
            "current_stock": p.current_stock,
            "unit_price": float(p.unit_price),
            "unit_cost": float(p.unit_cost),
            "reorder_point": p.reorder_point
        } for p in products]
        
        df = pd.DataFrame(data)
        df.to_csv(csv_buffer, index=False)
    
    else:
        raise HTTPException(status_code=400, detail="Invalid report type")
    
    csv_buffer.seek(0)
    filename = f"{report_type}_report_{start_date or 'all'}_{end_date or 'all'}.csv"
    
    return StreamingResponse(
        io.BytesIO(csv_buffer.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
