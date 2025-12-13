/**
 * Reports API routes.
 */
const express = require('express');
const asyncHandler = require('express-async-handler');
const { authenticate } = require('../../middleware/auth');
const { getReportsData } = require('../../services/reportsService');

const router = express.Router();

// GET / - Get comprehensive reports
router.get('', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const { start_date, end_date } = req.query;
  
  const reportData = await getReportsData(
    req.user.shop_id,
    start_date,
    end_date,
  );
  
  res.json(reportData);
}));

// GET /export/excel
router.get('/export/excel', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  // Placeholder for Excel export
  res.json({
    message: 'Excel export would be generated here',
  });
}));

// GET /export/csv
router.get('/export/csv', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  // Placeholder for CSV export
  res.json({
    message: 'CSV export would be generated here',
  });
}));

module.exports = router;

