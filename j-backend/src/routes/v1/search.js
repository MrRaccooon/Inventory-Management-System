/**
 * Search API routes.
 */
const express = require('express');
const asyncHandler = require('express-async-handler');
const { authenticate } = require('../../middleware/auth');
const { Product, Customer, Supplier, Sale } = require('../../models');
const { Op } = require('sequelize');

const router = express.Router();

// GET /global
router.get('/global', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.json({
      query: req.query.q,
      results: { products: [], customers: [], suppliers: [], sales: [] },
      total: 0,
    });
  }
  
  const { q, limit = 10 } = req.query;
  const searchPattern = `%${q}%`;
  
  // Search products
  const products = await Product.findAll({
    where: {
      shop_id: req.user.shop_id,
      [Op.or]: [
        { name: { [Op.iLike]: searchPattern } },
        { sku: { [Op.iLike]: searchPattern } },
        { description: { [Op.iLike]: searchPattern } },
      ],
    },
    limit: parseInt(limit, 10),
  });
  
  // Search customers
  const customers = await Customer.findAll({
    where: {
      shop_id: req.user.shop_id,
      [Op.or]: [
        { name: { [Op.iLike]: searchPattern } },
        { phone: { [Op.iLike]: searchPattern } },
        { email: { [Op.iLike]: searchPattern } },
      ],
    },
    limit: parseInt(limit, 10),
  });
  
  // Search suppliers
  const suppliers = await Supplier.findAll({
    where: {
      shop_id: req.user.shop_id,
      [Op.or]: [
        { name: { [Op.iLike]: searchPattern } },
        { company_name: { [Op.iLike]: searchPattern } },
        { phone: { [Op.iLike]: searchPattern } },
      ],
    },
    limit: parseInt(limit, 10),
  });
  
  // Search sales
  const sales = await Sale.findAll({
    where: {
      shop_id: req.user.shop_id,
      invoice_no: { [Op.iLike]: searchPattern },
    },
    limit: parseInt(limit, 10),
  });
  
  res.json({
    query: q,
    results: {
      products: products.map(p => ({
        id: p.id,
        type: 'product',
        name: p.name,
        sku: p.sku,
        price: parseFloat(p.price_mrp),
        stock: p.current_stock,
      })),
      customers: customers.map(c => ({
        id: c.id,
        type: 'customer',
        name: c.name,
        phone: c.phone,
        email: c.email,
      })),
      suppliers: suppliers.map(s => ({
        id: s.id,
        type: 'supplier',
        name: s.name,
        company: s.company_name,
        phone: s.phone,
      })),
      sales: sales.map(s => ({
        id: s.id,
        type: 'sale',
        invoice_no: s.invoice_no,
        total_amount: parseFloat(s.total_amount),
        date: s.created_at.toISOString(),
      })),
    },
    total: products.length + customers.length + suppliers.length + sales.length,
  });
}));

// GET /advanced/products
router.get('/advanced/products', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.json({ products: [], total: 0, filters_applied: {} });
  }
  
  const {
    name, sku, category_id,
    min_price, max_price,
    min_stock, max_stock,
    is_active, low_stock_only,
    skip = 0, limit = 100,
  } = req.query;
  
  const where = { shop_id: req.user.shop_id };
  const filtersApplied = {};
  
  if (name) {
    where.name = { [Op.iLike]: `%${name}%` };
    filtersApplied.name = name;
  }
  if (sku) {
    where.sku = { [Op.iLike]: `%${sku}%` };
    filtersApplied.sku = sku;
  }
  if (category_id) {
    where.category_id = category_id;
    filtersApplied.category_id = category_id;
  }
  if (min_price) {
    where.price_mrp = { ...where.price_mrp, [Op.gte]: parseFloat(min_price) };
    filtersApplied.min_price = parseFloat(min_price);
  }
  if (max_price) {
    where.price_mrp = { ...where.price_mrp, [Op.lte]: parseFloat(max_price) };
    filtersApplied.max_price = parseFloat(max_price);
  }
  if (min_stock) {
    where.current_stock = { ...where.current_stock, [Op.gte]: parseInt(min_stock, 10) };
    filtersApplied.min_stock = parseInt(min_stock, 10);
  }
  if (max_stock) {
    where.current_stock = { ...where.current_stock, [Op.lte]: parseInt(max_stock, 10) };
    filtersApplied.max_stock = parseInt(max_stock, 10);
  }
  if (is_active !== undefined) {
    where.is_active = is_active === 'true';
    filtersApplied.is_active = is_active === 'true';
  }
  if (low_stock_only === 'true') {
    where.current_stock = { [Op.lte]: { [Op.col]: 'min_stock_threshold' } };
    filtersApplied.low_stock_only = true;
  }
  
  const { count, rows } = await Product.findAndCountAll({
    where,
    order: [['name', 'ASC']],
    offset: parseInt(skip, 10),
    limit: parseInt(limit, 10),
  });
  
  res.json({
    products: rows.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: parseFloat(p.price_mrp),
      cost: parseFloat(p.cost_price),
      stock: p.current_stock,
      min_stock: p.min_stock_threshold,
      category_id: p.category_id,
      is_active: p.is_active,
    })),
    total: count,
    skip: parseInt(skip, 10),
    limit: parseInt(limit, 10),
    filters_applied: filtersApplied,
  });
}));

// GET /advanced/sales
router.get('/advanced/sales', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.json({ sales: [], total: 0, filters_applied: {} });
  }
  
  const {
    invoice_no, payment_type, status,
    min_amount, max_amount,
    start_date, end_date,
    skip = 0, limit = 100,
  } = req.query;
  
  const where = { shop_id: req.user.shop_id };
  const filtersApplied = {};
  
  if (invoice_no) {
    where.invoice_no = { [Op.iLike]: `%${invoice_no}%` };
    filtersApplied.invoice_no = invoice_no;
  }
  if (payment_type) {
    where.payment_type = payment_type;
    filtersApplied.payment_type = payment_type;
  }
  if (status) {
    where.status = status;
    filtersApplied.status = status;
  }
  if (min_amount) {
    where.total_amount = { ...where.total_amount, [Op.gte]: parseFloat(min_amount) };
    filtersApplied.min_amount = parseFloat(min_amount);
  }
  if (max_amount) {
    where.total_amount = { ...where.total_amount, [Op.lte]: parseFloat(max_amount) };
    filtersApplied.max_amount = parseFloat(max_amount);
  }
  if (start_date) {
    where.created_at = { ...where.created_at, [Op.gte]: new Date(start_date) };
    filtersApplied.start_date = start_date;
  }
  if (end_date) {
    where.created_at = { ...where.created_at, [Op.lte]: new Date(end_date) };
    filtersApplied.end_date = end_date;
  }
  
  const { count, rows } = await Sale.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    offset: parseInt(skip, 10),
    limit: parseInt(limit, 10),
  });
  
  res.json({
    sales: rows.map(s => ({
      id: s.id,
      invoice_no: s.invoice_no,
      total_amount: parseFloat(s.total_amount),
      profit: parseFloat(s.profit),
      payment_type: s.payment_type,
      status: s.status,
      date: s.created_at.toISOString(),
    })),
    total: count,
    skip: parseInt(skip, 10),
    limit: parseInt(limit, 10),
    filters_applied: filtersApplied,
  });
}));

module.exports = router;

