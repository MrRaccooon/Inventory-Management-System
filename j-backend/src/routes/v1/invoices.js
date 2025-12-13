/**
 * Invoices API routes.
 */
const express = require('express');
const asyncHandler = require('express-async-handler');
const { authenticate } = require('../../middleware/auth');
const { Invoice, Sale } = require('../../models');
const { Op } = require('sequelize');
const { createInvoice } = require('../../services/gstService');

const router = express.Router();

// POST /:sale_id - Create invoice for sale
router.post('/:sale_id', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  try {
    const invoice = await createInvoice(
      req.params.sale_id,
      req.user.shop_id,
      req.user.id,
    );
    res.status(201).json(invoice);
  } catch (error) {
    res.status(400).json({ detail: error.message });
  }
}));

// GET / - List invoices
router.get('', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const { skip = 0, limit = 100, start_date, end_date } = req.query;
  
  const where = {};
  if (start_date) {
    where.created_at = { ...where.created_at, [Op.gte]: new Date(start_date) };
  }
  if (end_date) {
    where.created_at = { ...where.created_at, [Op.lte]: new Date(end_date) };
  }
  
  const invoices = await Invoice.findAll({
    where,
    include: [{
      model: Sale,
      as: 'sale',
      where: { shop_id: req.user.shop_id },
    }],
    order: [['created_at', 'DESC']],
    offset: parseInt(skip, 10),
    limit: parseInt(limit, 10),
  });
  
  res.json(invoices);
}));

// GET /:invoice_id
router.get('/:invoice_id', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const invoice = await Invoice.findOne({
    where: { id: req.params.invoice_id },
    include: [{
      model: Sale,
      as: 'sale',
      where: { shop_id: req.user.shop_id },
    }],
  });
  
  if (!invoice) {
    return res.status(404).json({ detail: 'Invoice not found' });
  }
  
  res.json(invoice);
}));

// GET /sale/:sale_id
router.get('/sale/:sale_id', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const sale = await Sale.findOne({
    where: { id: req.params.sale_id, shop_id: req.user.shop_id },
  });
  
  if (!sale) {
    return res.status(404).json({ detail: 'Sale not found' });
  }
  
  const invoices = await Invoice.findAll({
    where: { sale_id: req.params.sale_id },
  });
  
  res.json(invoices);
}));

// DELETE /:invoice_id
router.delete('/:invoice_id', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  if (!['owner', 'manager', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      detail: 'Only owners and managers can delete invoices',
    });
  }
  
  const invoice = await Invoice.findOne({
    where: { id: req.params.invoice_id },
    include: [{
      model: Sale,
      as: 'sale',
      where: { shop_id: req.user.shop_id },
    }],
  });
  
  if (!invoice) {
    return res.status(404).json({ detail: 'Invoice not found' });
  }
  
  await invoice.destroy();
  
  res.status(204).send();
}));

module.exports = router;

