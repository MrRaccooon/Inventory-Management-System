/**
 * Employee management service.
 * Handles employee CRUD, attendance, and performance tracking.
 */
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const { User, EmployeeAttendance, Sale } = require('../models');
const { getPasswordHash } = require('../utils/auth');
const { logAction } = require('../utils/audit');

/**
 * Create a new employee.
 */
const createEmployee = async (shopId, employeeData, createdBy = null) => {
  const existing = await User.findOne({ where: { email: employeeData.email } });
  if (existing) {
    throw new Error(`User with email ${employeeData.email} already exists`);
  }
  
  const passwordHash = await getPasswordHash(employeeData.password);
  
  const employee = await User.create({
    id: uuidv4(),
    shop_id: shopId,
    name: employeeData.name,
    email: employeeData.email,
    password_hash: passwordHash,
    role: employeeData.role || 'staff',
    is_active: true,
  });
  
  await logAction({
    action: 'create_employee',
    userId: createdBy,
    shopId,
    objectType: 'user',
    objectId: employee.id,
    payload: { email: employeeData.email, role: employeeData.role },
  });
  
  return employee;
};

/**
 * Get a single employee by ID.
 */
const getEmployee = async (employeeId, shopId) => {
  return User.findOne({
    where: { id: employeeId, shop_id: shopId },
  });
};

/**
 * List employees with filtering and pagination.
 */
const listEmployees = async (shopId, options = {}) => {
  const {
    skip = 0,
    limit = 100,
    role = null,
    isActive = null,
    search = null,
  } = options;
  
  const where = {
    shop_id: shopId,
    role: { [Op.ne]: 'admin' },
  };
  
  if (role) {
    where.role = role;
  }
  
  if (isActive !== null) {
    where.is_active = isActive;
  }
  
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
    ];
  }
  
  const { count, rows } = await User.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    offset: skip,
    limit,
  });
  
  return { employees: rows, total: count };
};

/**
 * Update an employee.
 */
const updateEmployee = async (employeeId, shopId, employeeData, updatedBy = null) => {
  const employee = await getEmployee(employeeId, shopId);
  if (!employee) return null;
  
  const updateFields = {};
  const allowedFields = ['name', 'email', 'role', 'is_active'];
  
  for (const field of allowedFields) {
    if (employeeData[field] !== undefined) {
      updateFields[field] = employeeData[field];
    }
  }
  
  await employee.update(updateFields);
  
  await logAction({
    action: 'update_employee',
    userId: updatedBy,
    shopId,
    objectType: 'user',
    objectId: employeeId,
    payload: updateFields,
  });
  
  return employee;
};

/**
 * Record employee check-in.
 */
const recordAttendance = async (shopId, employeeId, checkinAt = null) => {
  const attendance = await EmployeeAttendance.create({
    id: uuidv4(),
    employee_id: employeeId,
    shop_id: shopId,
    checkin_at: checkinAt || new Date(),
    status: 'present',
  });
  
  return attendance;
};

/**
 * Record employee check-out.
 */
const recordCheckout = async (attendanceId, shopId, checkoutAt = null) => {
  const attendance = await EmployeeAttendance.findOne({
    where: { id: attendanceId, shop_id: shopId },
  });
  
  if (!attendance) return null;
  
  await attendance.update({
    checkout_at: checkoutAt || new Date(),
  });
  
  return attendance;
};

/**
 * Get employee performance metrics.
 */
const getEmployeePerformance = async (shopId, employeeId, startDate = null, endDate = null) => {
  const where = {
    shop_id: shopId,
    created_by: employeeId,
    status: { [Op.ne]: 'void' },
  };
  
  if (startDate) {
    where.created_at = { ...where.created_at, [Op.gte]: new Date(startDate) };
  }
  if (endDate) {
    where.created_at = { ...where.created_at, [Op.lte]: new Date(endDate) };
  }
  
  const sales = await Sale.findAll({ where });
  
  const totalSales = sales.reduce((sum, s) => sum + parseFloat(s.total_amount), 0);
  const totalProfit = sales.reduce((sum, s) => sum + parseFloat(s.profit), 0);
  const orderCount = sales.length;
  const avgOrderValue = orderCount > 0 ? totalSales / orderCount : 0;
  
  const employee = await getEmployee(employeeId, shopId);
  
  return {
    employee_id: employeeId,
    employee_name: employee?.name || 'Unknown',
    total_sales: totalSales,
    total_profit: totalProfit,
    order_count: orderCount,
    avg_order_value: avgOrderValue,
    errors_count: 0,
    last_login: employee?.last_login?.toISOString() || null,
  };
};

module.exports = {
  createEmployee,
  getEmployee,
  listEmployees,
  updateEmployee,
  recordAttendance,
  recordCheckout,
  getEmployeePerformance,
};

