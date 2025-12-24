/**
 * File: auth.route.js
 * Purpose: Authentication routes with middleware composition
 * Layer: Route
 * Notes:
 * - HTTP wiring only (paths, methods, middleware composition)
 * - No business logic in routes
 * - Proper middleware ordering: rate limit → validation → auth → RBAC → controller
 * - Follows project coding standards
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');
const rateLimiterMiddleware = require('../middlewares/rateLimiter.middleware');
const auditMiddleware = require('../middlewares/audit.middleware');

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

/**
 * @route   POST /api/v1/auth/register/owner
 * @desc    Register new tenant owner (creates tenant + admin user)
 * @access  Public
 */
router.post(
  '/register/owner',
  rateLimiterMiddleware('register'),
  auditMiddleware('USER_REGISTERED'),
  authController.registerOwner
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user with email/password
 * @access  Public
 */
router.post(
  '/login',
  rateLimiterMiddleware('login'),
  auditMiddleware('USER_LOGIN'),
  authController.login
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public (with refresh token)
 */
router.post(
  '/refresh',
  rateLimiterMiddleware('refresh'),
  authController.refreshToken
);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
router.post(
  '/forgot-password',
  rateLimiterMiddleware('forgotPassword'),
  authController.forgotPassword
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public (with reset token)
 */
router.post(
  '/reset-password',
  rateLimiterMiddleware('resetPassword'),
  auditMiddleware('PASSWORD_RESET'),
  authController.resetPassword
);

// ============================================================================
// PROTECTED ROUTES (Authentication required)
// ============================================================================

/**
 * @route   POST /api/v1/auth/register/employee
 * @desc    Register new employee within tenant (Admin/Manager only)
 * @access  Private (Admin, Manager)
 */
router.post(
  '/register/employee',
  authMiddleware,
  authMiddleware.checkActiveStatus,
  rbacMiddleware(['admin', 'manager']),
  rateLimiterMiddleware('register'),
  auditMiddleware('EMPLOYEE_REGISTERED'),
  authController.registerEmployee
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user and invalidate session
 * @access  Private
 */
router.post(
  '/logout',
  authMiddleware,
  auditMiddleware('USER_LOGOUT'),
  authController.logout
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current authenticated user profile
 * @access  Private
 */
router.get(
  '/me',
  authMiddleware,
  authMiddleware.checkActiveStatus,
  authController.getCurrentUser
);

/**
 * @route   PATCH /api/v1/auth/profile
 * @desc    Update authenticated user's profile
 * @access  Private
 */
router.patch(
  '/profile',
  authMiddleware,
  authMiddleware.checkActiveStatus,
  auditMiddleware('PROFILE_UPDATED'),
  authController.updateProfile
);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change password for authenticated user
 * @access  Private
 */
router.post(
  '/change-password',
  authMiddleware,
  authMiddleware.checkActiveStatus,
  rateLimiterMiddleware('changePassword'),
  auditMiddleware('PASSWORD_CHANGED'),
  authController.changePassword
);

module.exports = router;
