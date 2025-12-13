/**
 * Profitability API routes.
 */
const express = require('express');
const asyncHandler = require('express-async-handler');
const { authenticate } = require('../../middleware/auth');
const { getProfitabilityAnalysis } = require('../../services/profitabilityService');

const router = express.Router();

// GET / - Get profitability analysis
router.get('', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const { start_date, end_date } = req.query;
  
  const analysis = await getProfitabilityAnalysis(
    req.user.shop_id,
    start_date,
    end_date,
  );
  
  res.json(analysis);
}));

module.exports = router;

