/**
 * Dashboard API routes.
 */
const express = require('express');
const asyncHandler = require('express-async-handler');
const { authenticate } = require('../../middleware/auth');
const { getDashboardData } = require('../../services/dashboardService');

const router = express.Router();

// GET / - Get complete dashboard data
router.get('', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({
      detail: 'User is not associated with a shop',
    });
  }
  
  const { start_date, end_date } = req.query;
  
  const dashboardData = await getDashboardData(
    req.user.shop_id,
    start_date,
    end_date,
  );
  
  res.json(dashboardData);
}));

module.exports = router;

