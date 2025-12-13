/**
 * Employees API routes.
 */
const express = require('express');
const asyncHandler = require('express-async-handler');
const { authenticate, requireRole } = require('../../middleware/auth');
const {
  createEmployee,
  getEmployee,
  listEmployees,
  updateEmployee,
  recordAttendance,
  recordCheckout,
  getEmployeePerformance,
} = require('../../services/employeeService');

const router = express.Router();

// POST / - Create employee
router.post('', authenticate, requireRole(['owner', 'manager', 'admin']), asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  try {
    const employee = await createEmployee(req.user.shop_id, req.body, req.user.id);
    res.status(201).json(employee);
  } catch (error) {
    res.status(400).json({ detail: error.message });
  }
}));

// GET / - List employees
router.get('', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const { skip = 0, limit = 100, role, is_active, search } = req.query;
  
  const { employees, total } = await listEmployees(req.user.shop_id, {
    skip: parseInt(skip, 10),
    limit: parseInt(limit, 10),
    role,
    isActive: is_active === 'true' ? true : is_active === 'false' ? false : null,
    search,
  });
  
  res.json({
    items: employees,
    total,
    page: Math.floor(parseInt(skip, 10) / parseInt(limit, 10)) + 1,
    page_size: parseInt(limit, 10),
  });
}));

// GET /:employee_id
router.get('/:employee_id', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const employee = await getEmployee(req.params.employee_id, req.user.shop_id);
  if (!employee) {
    return res.status(404).json({ detail: 'Employee not found' });
  }
  
  res.json(employee);
}));

// PATCH /:employee_id
router.patch('/:employee_id', authenticate, requireRole(['owner', 'manager', 'admin']), asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const employee = await updateEmployee(
    req.params.employee_id,
    req.user.shop_id,
    req.body,
    req.user.id,
  );
  
  if (!employee) {
    return res.status(404).json({ detail: 'Employee not found' });
  }
  
  res.json(employee);
}));

// POST /attendance
router.post('/attendance', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const { employee_id, checkin_at } = req.body;
  
  const attendance = await recordAttendance(
    req.user.shop_id,
    employee_id,
    checkin_at ? new Date(checkin_at) : null,
  );
  
  res.status(201).json(attendance);
}));

// PATCH /attendance/:attendance_id
router.patch('/attendance/:attendance_id', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const { checkout_at } = req.body;
  
  const attendance = await recordCheckout(
    req.params.attendance_id,
    req.user.shop_id,
    checkout_at ? new Date(checkout_at) : null,
  );
  
  if (!attendance) {
    return res.status(404).json({ detail: 'Attendance record not found' });
  }
  
  res.json(attendance);
}));

// GET /:employee_id/performance
router.get('/:employee_id/performance', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const { start_date, end_date } = req.query;
  
  const performance = await getEmployeePerformance(
    req.user.shop_id,
    req.params.employee_id,
    start_date,
    end_date,
  );
  
  res.json(performance);
}));

module.exports = router;

