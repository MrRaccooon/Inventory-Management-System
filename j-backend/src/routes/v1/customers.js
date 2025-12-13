/**
 * Customers API routes.
 */
const express = require('express');
const asyncHandler = require('express-async-handler');
const { v4: uuidv4 } = require('uuid');
const { authenticate, requireRole } = require('../../middleware/auth');
const { Customer, Sale } = require('../../models');
const { Op } = require('sequelize');

const router = express.Router();

// POST / - Create customer
router.post('', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const existing = await Customer.findOne({
    where: { shop_id: req.user.shop_id, phone: req.body.phone },
  });
  
  if (existing) {
    return res.status(400).json({ detail: 'Customer with this phone number already exists' });
  }
  
  const newCustomer = await Customer.create({
    id: uuidv4(),
    shop_id: req.user.shop_id,
    ...req.body,
  });
  
  res.status(201).json(newCustomer);
}));

// GET / - List customers
router.get('', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.json({ customers: [], total: 0, skip: 0, limit: 100 });
  }
  
  const { skip = 0, limit = 100, search, is_active } = req.query;
  
  const where = { shop_id: req.user.shop_id };
  
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { phone: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
    ];
  }
  
  if (is_active !== undefined) {
    where.is_active = is_active === 'true';
  }
  
  const { count, rows } = await Customer.findAndCountAll({
    where,
    order: [['name', 'ASC']],
    offset: parseInt(skip, 10),
    limit: parseInt(limit, 10),
  });
  
  res.json({
    customers: rows,
    total: count,
    skip: parseInt(skip, 10),
    limit: parseInt(limit, 10),
  });
}));

// GET /:customer_id
router.get('/:customer_id', authenticate, asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({
    where: { id: req.params.customer_id, shop_id: req.user.shop_id },
  });
  
  if (!customer) {
    return res.status(404).json({ detail: 'Customer not found' });
  }
  
  res.json(customer);
}));

// PATCH /:customer_id
router.patch('/:customer_id', authenticate, asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({
    where: { id: req.params.customer_id, shop_id: req.user.shop_id },
  });
  
  if (!customer) {
    return res.status(404).json({ detail: 'Customer not found' });
  }
  
  await customer.update(req.body);
  
  res.json(customer);
}));

// DELETE /:customer_id
router.delete('/:customer_id', authenticate, requireRole(['owner', 'manager', 'admin']), asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({
    where: { id: req.params.customer_id, shop_id: req.user.shop_id },
  });
  
  if (!customer) {
    return res.status(404).json({ detail: 'Customer not found' });
  }
  
  // Soft delete
  await customer.update({ is_active: false });
  
  res.status(204).send();
}));

// GET /:customer_id/purchase-history
router.get('/:customer_id/purchase-history', authenticate, asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({
    where: { id: req.params.customer_id, shop_id: req.user.shop_id },
  });
  
  if (!customer) {
    return res.status(404).json({ detail: 'Customer not found' });
  }
  
  const { skip = 0, limit = 50 } = req.query;
  
  const sales = await Sale.findAll({
    where: { shop_id: req.user.shop_id },
    order: [['created_at', 'DESC']],
  });
  
  // Filter by customer phone
  const customerSales = sales.filter(
    s => s.customer_info?.phone === customer.phone,
  );
  
  const paginatedSales = customerSales.slice(
    parseInt(skip, 10),
    parseInt(skip, 10) + parseInt(limit, 10),
  );
  
  res.json({
    customer_id: customer.id,
    customer_name: customer.name,
    total_purchases: parseFloat(customer.total_purchases),
    total_orders: customerSales.length,
    purchases: paginatedSales.map(s => ({
      sale_id: s.id,
      invoice_no: s.invoice_no,
      date: s.created_at.toISOString(),
      total_amount: parseFloat(s.total_amount),
      payment_type: s.payment_type,
      status: s.status,
    })),
    skip: parseInt(skip, 10),
    limit: parseInt(limit, 10),
    total: customerSales.length,
  });
}));

module.exports = router;

