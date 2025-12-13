/**
 * AI Analytics API routes.
 */
const express = require('express');
const asyncHandler = require('express-async-handler');
const { authenticate } = require('../../middleware/auth');
const { getOrCreateAIInsights, generateForecast } = require('../../services/aiService');

const router = express.Router();

// GET / - Get AI analytics
router.get('', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const { force_refresh } = req.query;
  
  const insights = await getOrCreateAIInsights(
    req.user.shop_id,
    force_refresh === 'true',
  );
  
  res.json(insights);
}));

// POST /forecast
router.post('/forecast', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const { product_id, forecast_date } = req.query;
  
  const forecasts = await generateForecast(
    req.user.shop_id,
    product_id,
    forecast_date,
  );
  
  res.json({
    forecasts: forecasts.map(f => ({
      id: f.id,
      product_id: f.product_id,
      for_date: f.for_date,
      forecast_qty: parseFloat(f.forecast_qty),
      lower_bound: f.lower_bound ? parseFloat(f.lower_bound) : null,
      upper_bound: f.upper_bound ? parseFloat(f.upper_bound) : null,
      model_version: f.model_version,
    })),
    count: forecasts.length,
  });
}));

module.exports = router;

