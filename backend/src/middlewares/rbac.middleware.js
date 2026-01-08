/**
 * File: rbac.middleware.js
 * Purpose: Role-based access control
 * Layer: Middleware
 * Notes:
 * - Checks if user has required role
 * - Must be used AFTER authMiddleware
 * - Follows project coding standards
 */

const { ERROR_CODES, USER_ROLES, SUBSCRIPTION_LIMITS } = require('../utils/constants');


/**
 * RBAC middleware factory
 * @param {Array} allowedRoles - Array of allowed roles
 * @returns {Function} Express middleware
 */
const rbacMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Authentication required'
        }
      });
    }

    // Check if user's role is in allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: ERROR_CODES.FORBIDDEN,
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
        }
      });
    }

    next();
  };
};

/**
 * Predefined role middleware for common use cases
 */
const adminOnly = rbacMiddleware([USER_ROLES.ADMIN]);
const adminOrManager = rbacMiddleware([USER_ROLES.ADMIN, USER_ROLES.MANAGER]);
const allRoles = rbacMiddleware([
  USER_ROLES.ADMIN,
  USER_ROLES.MANAGER,
  USER_ROLES.SALES_ASSOCIATE,      // ✅ Changed from SALES_ASSOCIATE
  USER_ROLES.INVENTORY_CLERK        // ✅ Changed from INVENTORY_CLERK
]);

module.exports = rbacMiddleware;
module.exports.adminOnly = adminOnly;
module.exports.adminOrManager = adminOrManager;
module.exports.allRoles = allRoles;
