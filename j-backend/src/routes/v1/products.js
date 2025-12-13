/**
 * Products/Inventory API routes.
 */
const express = require('express');
const asyncHandler = require('express-async-handler');
const { authenticate } = require('../../middleware/auth');
const { Product } = require('../../models');
const {
  createProduct,
  getProduct,
  listProducts,
  updateProduct,
  adjustProductStock,
  getInventorySummary,
} = require('../../services/inventoryService');
const { checkAndAlertLowStock } = require('../../services/notificationService');

const router = express.Router();

// GET /barcode/:barcode
router.get('/barcode/:barcode', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const product = await Product.findOne({
    where: { shop_id: req.user.shop_id, sku: req.params.barcode },
  });
  
  if (!product) {
    return res.status(404).json({
      detail: `Product with barcode '${req.params.barcode}' not found`,
    });
  }
  
  res.json({
    id: product.id,
    name: product.name,
    sku: product.sku,
    current_stock: product.current_stock,
    unit_price: parseFloat(product.price_mrp),
    unit_cost: parseFloat(product.cost_price),
    category_id: product.category_id,
    reorder_point: product.min_stock_threshold,
    is_active: product.is_active,
  });
}));

// POST /scan-barcode
router.post('/scan-barcode', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const { barcodes } = req.body;
  const results = [];
  
  for (const barcode of barcodes) {
    const product = await Product.findOne({
      where: { shop_id: req.user.shop_id, sku: barcode },
    });
    
    if (product) {
      results.push({
        barcode,
        found: true,
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku,
          current_stock: product.current_stock,
          unit_price: parseFloat(product.price_mrp),
          unit_cost: parseFloat(product.cost_price),
        },
      });
    } else {
      results.push({
        barcode,
        found: false,
        error: 'Product not found',
      });
    }
  }
  
  res.json({
    scanned: barcodes.length,
    found: results.filter(r => r.found).length,
    not_found: results.filter(r => !r.found).length,
    results,
  });
}));

// GET /low-stock
router.get('/low-stock', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  // const { Op } = require('sequelize'); // Available if needed
  const { getCurrentStock } = require('../../utils/ledger');
  
  const products = await Product.findAll({
    where: { shop_id: req.user.shop_id },
  });
  
  const lowStockProducts = [];
  for (const p of products) {
    const stock = await getCurrentStock(p.id, req.user.shop_id);
    if (stock <= p.min_stock_threshold) {
      lowStockProducts.push({
        id: p.id,
        name: p.name,
        sku: p.sku,
        current_stock: stock,
        reorder_point: p.min_stock_threshold,
        unit_price: parseFloat(p.price_mrp),
        unit_cost: parseFloat(p.cost_price),
      });
    }
  }
  
  res.json({
    low_stock_products: lowStockProducts,
    count: lowStockProducts.length,
  });
}));

// POST /check-low-stock
router.post('/check-low-stock', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const notifications = await checkAndAlertLowStock(req.user.shop_id);
  
  res.json({
    message: `Low stock check completed. Created ${notifications.length} alert(s)`,
    alerts_created: notifications.length,
    notifications: notifications.map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
    })),
  });
}));

// POST / - Create product
router.post('', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  try {
    const product = await createProduct(req.user.shop_id, req.body, req.user.id);
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ detail: error.message });
  }
}));

// GET / - List products
router.get('', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const {
    skip = 0,
    limit = 100,
    category_id,
    search,
    is_active,
    low_stock_only,
  } = req.query;
  
  const { products, total } = await listProducts(req.user.shop_id, {
    skip: parseInt(skip, 10),
    limit: parseInt(limit, 10),
    categoryId: category_id,
    search,
    isActive: is_active === 'true' ? true : is_active === 'false' ? false : null,
    lowStockOnly: low_stock_only === 'true',
  });
  
  res.json({
    items: products,
    total,
    page: Math.floor(parseInt(skip, 10) / parseInt(limit, 10)) + 1,
    page_size: parseInt(limit, 10),
  });
}));

// GET /summary
router.get('/summary', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const summary = await getInventorySummary(req.user.shop_id);
  res.json(summary);
}));

// GET /:product_id
router.get('/:product_id', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const product = await getProduct(req.params.product_id, req.user.shop_id);
  if (!product) {
    return res.status(404).json({ detail: 'Product not found' });
  }
  
  res.json(product);
}));

// PATCH /:product_id
router.patch('/:product_id', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const product = await updateProduct(
    req.params.product_id,
    req.user.shop_id,
    req.body,
    req.user.id,
  );
  
  if (!product) {
    return res.status(404).json({ detail: 'Product not found' });
  }
  
  res.json(product);
}));

// POST /:product_id/adjust-stock
router.post('/:product_id/adjust-stock', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const { new_quantity, reason = 'Manual adjustment' } = req.query;
  
  const product = await adjustProductStock(
    req.params.product_id,
    req.user.shop_id,
    parseInt(new_quantity, 10),
    reason,
    req.user.id,
  );
  
  if (!product) {
    return res.status(404).json({ detail: 'Product not found' });
  }
  
  res.json(product);
}));

module.exports = router;

