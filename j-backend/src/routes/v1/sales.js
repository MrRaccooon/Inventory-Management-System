/**
 * Sales API routes.
 */
const express = require('express');
const asyncHandler = require('express-async-handler');
const { authenticate } = require('../../middleware/auth');
const { Sale } = require('../../models');
const { Op, fn, col } = require('sequelize');
const {
  createSale,
  getSale,
  listSales,
  updateSale,
  voidSale,
} = require('../../services/salesService');
const { recordStockMovement } = require('../../utils/ledger');

const router = express.Router();

// GET /payment-methods
router.get('/payment-methods', asyncHandler(async (req, res) => {
  res.json({
    payment_methods: [
      { code: 'cash', name: 'Cash', description: 'Cash payment' },
      { code: 'card', name: 'Card', description: 'Debit/Credit card' },
      { code: 'upi', name: 'UPI', description: 'UPI payment (Google Pay, PhonePe, etc.)' },
      { code: 'credit', name: 'Credit', description: 'Credit/Account payment' },
      { code: 'other', name: 'Other', description: 'Other payment methods' },
    ],
  });
}));

// GET /payment-stats
router.get('/payment-stats', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const { start_date, end_date } = req.query;
  
  const where = {
    shop_id: req.user.shop_id,
    status: { [Op.in]: ['paid', 'pending'] },
  };
  
  if (start_date) {
    where.created_at = { ...where.created_at, [Op.gte]: new Date(start_date) };
  }
  if (end_date) {
    where.created_at = { ...where.created_at, [Op.lte]: new Date(end_date) };
  }
  
  const results = await Sale.findAll({
    attributes: [
      'payment_type',
      [fn('COUNT', col('id')), 'count'],
      [fn('SUM', col('total_amount')), 'total_amount'],
    ],
    where,
    group: ['payment_type'],
  });
  
  res.json({
    payment_stats: results.map(row => ({
      payment_type: row.payment_type,
      count: parseInt(row.dataValues.count, 10),
      total_amount: parseFloat(row.dataValues.total_amount || 0),
    })),
  });
}));

// POST / - Create sale
router.post('', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  try {
    const sale = await createSale(req.user.shop_id, req.body, req.user.id);
    res.status(201).json(sale);
  } catch (error) {
    res.status(400).json({ detail: error.message });
  }
}));

// GET / - List sales
router.get('', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const {
    skip = 0,
    limit = 100,
    start_date,
    end_date,
    payment_type,
    status,
    search,
  } = req.query;
  
  const { sales, total } = await listSales(req.user.shop_id, {
    skip: parseInt(skip, 10),
    limit: parseInt(limit, 10),
    startDate: start_date,
    endDate: end_date,
    paymentType: payment_type,
    status,
    search,
  });
  
  res.json({
    items: sales,
    total,
    page: Math.floor(parseInt(skip, 10) / parseInt(limit, 10)) + 1,
    page_size: parseInt(limit, 10),
  });
}));

// GET /:sale_id
router.get('/:sale_id', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const sale = await getSale(req.params.sale_id, req.user.shop_id);
  if (!sale) {
    return res.status(404).json({ detail: 'Sale not found' });
  }
  
  res.json(sale);
}));

// PATCH /:sale_id
router.patch('/:sale_id', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const sale = await updateSale(
    req.params.sale_id,
    req.user.shop_id,
    req.body,
    req.user.id,
  );
  
  if (!sale) {
    return res.status(404).json({ detail: 'Sale not found' });
  }
  
  res.json(sale);
}));

// POST /:sale_id/void
router.post('/:sale_id/void', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const sale = await voidSale(req.params.sale_id, req.user.shop_id, req.user.id);
  if (!sale) {
    return res.status(404).json({ detail: 'Sale not found' });
  }
  
  res.json(sale);
}));

// POST /:sale_id/refund
router.post('/:sale_id/refund', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const { reason, items } = req.body;
  
  const sale = await getSale(req.params.sale_id, req.user.shop_id);
  if (!sale) {
    return res.status(404).json({ detail: 'Sale not found' });
  }
  
  if (sale.status === 'refunded') {
    return res.status(400).json({ detail: 'Sale is already refunded' });
  }
  
  if (sale.status === 'void') {
    return res.status(400).json({ detail: 'Cannot refund a voided sale' });
  }
  
  // Process refund
  const itemsToRefund = items
    ? sale.items.filter(i => items.includes(i.id))
    : sale.items;
  
  for (const item of itemsToRefund) {
    await recordStockMovement({
      shopId: req.user.shop_id,
      productId: item.product_id,
      changeQty: item.quantity,
      reason: 'return',
      createdBy: req.user.id,
      referenceType: 'sale',
      referenceId: sale.id,
      metaData: { refund_reason: reason, item_id: item.id },
    });
  }
  
  await sale.update({
    status: 'refunded',
    notes: `${sale.notes || ''}\nRefund: ${reason}`.trim(),
  });
  
  res.json(sale);
}));

module.exports = router;

