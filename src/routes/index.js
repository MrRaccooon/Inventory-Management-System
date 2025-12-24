/**
 * File: index.js
 * Purpose: Main router aggregator
 * Layer: Route
 * Notes:
 * - Aggregates all route modules
 * - Follows project coding standards
 */

const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.route');

// Mount routes
router.use('/auth', authRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Inventory Management System API',
    version: 'v1',
    endpoints: {
      auth: '/api/v1/auth',
      health: '/health'
    }
  });
});

module.exports = router;
