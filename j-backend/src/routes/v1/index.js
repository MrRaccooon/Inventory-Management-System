/**
 * V1 API routes index.
 */
const express = require('express');

const authRoutes = require('./auth');
const dashboardRoutes = require('./dashboard');
const productsRoutes = require('./products');
const salesRoutes = require('./sales');
const gstRoutes = require('./gst');
const aiAnalyticsRoutes = require('./aiAnalytics');
const reportsRoutes = require('./reports');
const employeesRoutes = require('./employees');
const profitRoutes = require('./profit');
const invoicesRoutes = require('./invoices');
const shopsRoutes = require('./shops');
const categoriesRoutes = require('./categories');
const notificationsRoutes = require('./notifications');
const customersRoutes = require('./customers');
const suppliersRoutes = require('./suppliers');
const searchRoutes = require('./search');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/products', productsRoutes);
router.use('/sales', salesRoutes);
router.use('/gst', gstRoutes);
router.use('/ai-analytics', aiAnalyticsRoutes);
router.use('/reports', reportsRoutes);
router.use('/employees', employeesRoutes);
router.use('/profit', profitRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/shops', shopsRoutes);
router.use('/categories', categoriesRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/customers', customersRoutes);
router.use('/suppliers', suppliersRoutes);
router.use('/search', searchRoutes);

module.exports = router;

