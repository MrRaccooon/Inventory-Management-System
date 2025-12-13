/**
 * Suppliers API routes.
 */
const express = require('express');
const asyncHandler = require('express-async-handler');
const { v4: uuidv4 } = require('uuid');
const { authenticate, requireRole } = require('../../middleware/auth');
const { Supplier } = require('../../models');
const { Op } = require('sequelize');

const router = express.Router();

// POST / - Create supplier
router.post('', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const existing = await Supplier.findOne({
    where: { shop_id: req.user.shop_id, phone: req.body.phone },
  });
  
  if (existing) {
    return res.status(400).json({ detail: 'Supplier with this phone number already exists' });
  }
  
  const newSupplier = await Supplier.create({
    id: uuidv4(),
    shop_id: req.user.shop_id,
    ...req.body,
  });
  
  res.status(201).json(newSupplier);
}));

// GET / - List suppliers
router.get('', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.json({ suppliers: [], total: 0, skip: 0, limit: 100 });
  }
  
  const { skip = 0, limit = 100, search, is_active } = req.query;
  
  const where = { shop_id: req.user.shop_id };
  
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { company_name: { [Op.iLike]: `%${search}%` } },
      { phone: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
    ];
  }
  
  if (is_active !== undefined) {
    where.is_active = is_active === 'true';
  }
  
  const { count, rows } = await Supplier.findAndCountAll({
    where,
    order: [['name', 'ASC']],
    offset: parseInt(skip, 10),
    limit: parseInt(limit, 10),
  });
  
  res.json({
    suppliers: rows,
    total: count,
    skip: parseInt(skip, 10),
    limit: parseInt(limit, 10),
  });
}));

// GET /:supplier_id
router.get('/:supplier_id', authenticate, asyncHandler(async (req, res) => {
  const supplier = await Supplier.findOne({
    where: { id: req.params.supplier_id, shop_id: req.user.shop_id },
  });
  
  if (!supplier) {
    return res.status(404).json({ detail: 'Supplier not found' });
  }
  
  res.json(supplier);
}));

// PATCH /:supplier_id
router.patch('/:supplier_id', authenticate, asyncHandler(async (req, res) => {
  const supplier = await Supplier.findOne({
    where: { id: req.params.supplier_id, shop_id: req.user.shop_id },
  });
  
  if (!supplier) {
    return res.status(404).json({ detail: 'Supplier not found' });
  }
  
  await supplier.update(req.body);
  
  res.json(supplier);
}));

// DELETE /:supplier_id
router.delete('/:supplier_id', authenticate, requireRole(['owner', 'manager', 'admin']), asyncHandler(async (req, res) => {
  const supplier = await Supplier.findOne({
    where: { id: req.params.supplier_id, shop_id: req.user.shop_id },
  });
  
  if (!supplier) {
    return res.status(404).json({ detail: 'Supplier not found' });
  }
  
  // Soft delete
  await supplier.update({ is_active: false });
  
  res.status(204).send();
}));

module.exports = router;

