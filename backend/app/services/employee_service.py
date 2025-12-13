"""
Employee management service.
Handles employee CRUD, attendance, and performance tracking.
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc
from uuid import UUID
from decimal import Decimal
from datetime import datetime, date

from app.models.user import User, user_role
from app.models.employee_attendance import EmployeeAttendance
from app.models.sales import Sale, invoice_status
from app.utils.auth import get_password_hash
from app.utils.audit import log_action
from app.schemas.employees import EmployeeCreate, EmployeeUpdate


def create_employee(
    db: Session,
    shop_id: UUID,
    employee_data: EmployeeCreate,
    created_by: Optional[UUID] = None
) -> User:
    """
    Create a new employee.
    
    Args:
        db: Database session
        shop_id: Shop UUID
        employee_data: Employee creation data
        created_by: User UUID who created the employee
        
    Returns:
        Created User object
    """
    # Check if email already exists
    existing = db.query(User).filter(User.email == employee_data.email).first()
    if existing:
        raise ValueError(f"User with email {employee_data.email} already exists")
    
    employee = User(
        shop_id=shop_id,
        name=employee_data.name,
        email=employee_data.email,
        password_hash=get_password_hash(employee_data.password),
        role=user_role(employee_data.role),
        is_active=True
    )
    
    db.add(employee)
    db.flush()
    
    # Audit log
    log_action(
        db=db,
        action="create_employee",
        user_id=created_by,
        shop_id=shop_id,
        object_type="user",
        object_id=employee.id,
        payload={"email": employee_data.email, "role": employee_data.role}
    )
    
    db.commit()
    db.refresh(employee)
    return employee


def get_employee(db: Session, employee_id: UUID, shop_id: UUID) -> Optional[User]:
    """
    Get a single employee by ID.
    
    Args:
        db: Database session
        employee_id: Employee UUID
        shop_id: Shop UUID (for security)
        
    Returns:
        User object or None
    """
    return db.query(User).filter(
        and_(User.id == employee_id, User.shop_id == shop_id)
    ).first()


def list_employees(
    db: Session,
    shop_id: UUID,
    skip: int = 0,
    limit: int = 100,
    role_filter: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None
) -> tuple[List[User], int]:
    """
    List employees with filtering and pagination.
    
    Args:
        db: Database session
        shop_id: Shop UUID
        skip: Number of records to skip
        limit: Maximum number of records to return
        role_filter: Filter by role
        is_active: Filter by active status
        search: Search in name or email
        
    Returns:
        Tuple of (employees list, total count)
    """
    query = db.query(User).filter(User.shop_id == shop_id)
    
    # Exclude owner/admin roles from employee list (or include based on requirements)
    query = query.filter(User.role != user_role.admin)
    
    if role_filter:
        query = query.filter(User.role == role_filter)
    
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (User.name.ilike(search_pattern)) | (User.email.ilike(search_pattern))
        )
    
    total = query.count()
    employees = query.order_by(desc(User.created_at)).offset(skip).limit(limit).all()
    
    return employees, total


def update_employee(
    db: Session,
    employee_id: UUID,
    shop_id: UUID,
    employee_data: EmployeeUpdate,
    updated_by: Optional[UUID] = None
) -> Optional[User]:
    """
    Update an employee.
    
    Args:
        db: Database session
        employee_id: Employee UUID
        shop_id: Shop UUID
        employee_data: Update data
        updated_by: User UUID
        
    Returns:
        Updated User object or None if not found
    """
    employee = get_employee(db, employee_id, shop_id)
    if not employee:
        return None
    
    update_data = employee_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field == "role":
            setattr(employee, field, user_role(value))
        else:
            setattr(employee, field, value)
    
    employee.updated_at = datetime.utcnow()
    
    # Audit log
    log_action(
        db=db,
        action="update_employee",
        user_id=updated_by,
        shop_id=shop_id,
        object_type="user",
        object_id=employee_id,
        payload=update_data
    )
    
    db.commit()
    db.refresh(employee)
    return employee


def record_attendance(
    db: Session,
    shop_id: UUID,
    employee_id: UUID,
    checkin_at: Optional[datetime] = None
) -> EmployeeAttendance:
    """
    Record employee check-in.
    
    Args:
        db: Database session
        shop_id: Shop UUID
        employee_id: Employee UUID
        checkin_at: Check-in time (defaults to now)
        
    Returns:
        Created EmployeeAttendance record
    """
    if not checkin_at:
        checkin_at = datetime.utcnow()
    
    attendance = EmployeeAttendance(
        employee_id=employee_id,
        shop_id=shop_id,
        checkin_at=checkin_at,
        status="present"
    )
    
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    return attendance


def record_checkout(
    db: Session,
    attendance_id: UUID,
    shop_id: UUID,
    checkout_at: Optional[datetime] = None
) -> Optional[EmployeeAttendance]:
    """
    Record employee check-out.
    
    Args:
        db: Database session
        attendance_id: Attendance record UUID
        shop_id: Shop UUID
        checkout_at: Check-out time (defaults to now)
        
    Returns:
        Updated EmployeeAttendance record or None if not found
    """
    attendance = db.query(EmployeeAttendance).filter(
        and_(
            EmployeeAttendance.id == attendance_id,
            EmployeeAttendance.shop_id == shop_id
        )
    ).first()
    
    if not attendance:
        return None
    
    if not checkout_at:
        checkout_at = datetime.utcnow()
    
    attendance.checkout_at = checkout_at
    db.commit()
    db.refresh(attendance)
    return attendance


def get_employee_performance(
    db: Session,
    shop_id: UUID,
    employee_id: UUID,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> dict:
    """
    Get employee performance metrics.
    
    Args:
        db: Database session
        shop_id: Shop UUID
        employee_id: Employee UUID
        start_date: Start date for metrics
        end_date: End date for metrics
        
    Returns:
        Dictionary with performance metrics
    """
    query = db.query(Sale).filter(
        and_(
            Sale.shop_id == shop_id,
            Sale.created_by == employee_id,
            Sale.status != invoice_status.void
        )
    )
    
    if start_date:
        query = query.filter(func.date(Sale.created_at) >= start_date)
    if end_date:
        query = query.filter(func.date(Sale.created_at) <= end_date)
    
    sales = query.all()
    
    total_sales = sum(s.total_amount for s in sales)
    total_profit = sum(s.profit for s in sales)
    order_count = len(sales)
    avg_order_value = total_sales / order_count if order_count > 0 else 0
    
    # Get employee info
    employee = get_employee(db, employee_id, shop_id)
    
    return {
        "employee_id": str(employee_id),
        "employee_name": employee.name if employee else "Unknown",
        "total_sales": float(total_sales),
        "total_profit": float(total_profit),
        "order_count": order_count,
        "avg_order_value": float(avg_order_value),
        "errors_count": 0,  # Would need to track errors separately
        "last_login": employee.last_login.isoformat() if employee and employee.last_login else None
    }

