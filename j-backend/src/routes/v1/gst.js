/**
 * GST and Billing API routes.
 */
const express = require('express');
const asyncHandler = require('express-async-handler');
const { authenticate } = require('../../middleware/auth');
const { getGSTSummary, getGSTReport, createInvoice } = require('../../services/gstService');

const router = express.Router();

// GET /summary
router.get('/summary', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const { start_date, end_date } = req.query;
  
  const summary = await getGSTSummary(
    req.user.shop_id,
    start_date,
    end_date,
  );
  
  res.json(summary);
}));

// GET /report
router.get('/report', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const { start_date, end_date } = req.query;
  
  const report = await getGSTReport(
    req.user.shop_id,
    start_date,
    end_date,
  );
  
  res.json(report);
}));

// POST /invoices/:sale_id
router.post('/invoices/:sale_id', authenticate, asyncHandler(async (req, res) => {
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

module.exports = router;

