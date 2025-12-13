"""
Employee management API endpoints.
Handles employee CRUD, attendance, and performance tracking.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime, date

from app.db.session import get_db
from app.models.user import User
from app.utils.auth import get_current_active_user, require_role
from app.services.employee_service import (
    create_employee,
    get_employee,
    list_employees,
    update_employee,
    record_attendance,
    record_checkout,
    get_employee_performance
)
from app.schemas.employees import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeResponse,
    EmployeeListResponse,
    AttendanceCreate,
    AttendanceUpdate,
    AttendanceResponse,
    EmployeePerformance
)

router = APIRouter()


@router.post("", response_model=EmployeeResponse, status_code=201)
async def create_new_employee(
    employee_data: EmployeeCreate,
    current_user: User = Depends(require_role(["owner", "manager", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Create a new employee.
    Requires owner, manager, or admin role.
    
    Args:
        employee_data: Employee creation data
        current_user: Current authenticated user (with required role)
        db: Database session
        
    Returns:
        Created employee
    """
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    try:
        employee = create_employee(
            db=db,
            shop_id=current_user.shop_id,
            employee_data=employee_data,
            created_by=current_user.id
        )
        return employee
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=EmployeeListResponse)
async def list_all_employees(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    role: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List all employees with filtering and pagination.
    
    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        role: Filter by role
        is_active: Filter by active status
        search: Search in name or email
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Paginated list of employees
    """
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    employees, total = list_employees(
        db=db,
        shop_id=current_user.shop_id,
        skip=skip,
        limit=limit,
        role_filter=role,
        is_active=is_active,
        search=search
    )
    
    return {
        "items": employees,
        "total": total,
        "page": skip // limit + 1,
        "page_size": limit
    }


@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee_by_id(
    employee_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get a single employee by ID.
    
    Args:
        employee_id: Employee UUID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Employee details
    """
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    employee = get_employee(db=db, employee_id=employee_id, shop_id=current_user.shop_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    return employee


@router.patch("/{employee_id}", response_model=EmployeeResponse)
async def update_employee_by_id(
    employee_id: UUID,
    employee_data: EmployeeUpdate,
    current_user: User = Depends(require_role(["owner", "manager", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Update an employee.
    Requires owner, manager, or admin role.
    
    Args:
        employee_id: Employee UUID
        employee_data: Update data
        current_user: Current authenticated user (with required role)
        db: Database session
        
    Returns:
        Updated employee
    """
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    employee = update_employee(
        db=db,
        employee_id=employee_id,
        shop_id=current_user.shop_id,
        employee_data=employee_data,
        updated_by=current_user.id
    )
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    return employee


@router.post("/attendance", response_model=AttendanceResponse, status_code=201)
async def create_attendance(
    attendance_data: AttendanceCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Record employee check-in.
    
    Args:
        attendance_data: Attendance creation data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Created attendance record
    """
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    attendance = record_attendance(
        db=db,
        shop_id=current_user.shop_id,
        employee_id=attendance_data.employee_id,
        checkin_at=attendance_data.checkin_at
    )
    
    return attendance


@router.patch("/attendance/{attendance_id}", response_model=AttendanceResponse)
async def update_attendance(
    attendance_id: UUID,
    attendance_data: AttendanceUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update attendance record (checkout).
    
    Args:
        attendance_id: Attendance record UUID
        attendance_data: Update data (checkout time)
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Updated attendance record
    """
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    attendance = record_checkout(
        db=db,
        attendance_id=attendance_id,
        shop_id=current_user.shop_id,
        checkout_at=attendance_data.checkout_at
    )
    
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    
    return attendance


@router.get("/{employee_id}/performance", response_model=EmployeePerformance)
async def get_employee_performance_endpoint(
    employee_id: UUID,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get employee performance metrics.
    
    Args:
        employee_id: Employee UUID
        start_date: Start date for metrics
        end_date: End date for metrics
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Employee performance data
    """
    if not current_user.shop_id:
        raise HTTPException(status_code=400, detail="User is not associated with a shop")
    
    performance = get_employee_performance(
        db=db,
        shop_id=current_user.shop_id,
        employee_id=employee_id,
        start_date=start_date,
        end_date=end_date
    )
    
    return performance

