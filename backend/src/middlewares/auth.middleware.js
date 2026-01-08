/**
 * File: auth.middleware.js
 * Purpose: JWT verification and user authentication
 * Layer: Middleware
 * Notes:
 * - Verifies JWT tokens from Authorization header
 * - Extracts user information and attaches to req.user
 * - No business logic in middlewares
 * - Follows project coding standards
 */

const jwt = require('jsonwebtoken');
const { jwtConfig, supabaseAdmin } = require('../config/auth.config');
const { ERROR_CODES } = require('../utils/constants');


/**
 * Main authentication middleware
 * Verifies JWT token and attaches user data to request
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'No token provided. Please login to access this resource.'
        }
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Invalid token format'
        }
      });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, jwtConfig.secret, {
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience
      });
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: {
            code: ERROR_CODES.TOKEN_EXPIRED,
            message: 'Token has expired. Please refresh your token.'
          }
        });
      }

      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: {
            code: ERROR_CODES.INVALID_TOKEN,
            message: 'Invalid token. Please login again.'
          }
        });
      }

      throw jwtError;
    }

    // Verify user exists in Supabase Auth
    if (supabaseAdmin) {
      const { data: authUser, error } = await supabaseAdmin.auth.admin.getUserById(
        decoded.userId
      );

      if (error || !authUser) {
        return res.status(401).json({
          success: false,
          error: {
            code: ERROR_CODES.USER_NOT_FOUND,
            message: 'User not found or has been deleted'
          }
        });
      }

      // Check if user is banned or deleted in Supabase
      if (authUser.user.banned_until || authUser.user.deleted_at) {
        return res.status(403).json({
          success: false,
          error: {
            code: ERROR_CODES.ACCOUNT_INACTIVE,
            message: 'Your account has been deactivated. Please contact support.'
          }
        });
      }
    }

    // Attach user data to request object
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      tenantId: decoded.tenantId,
      role: decoded.role,
      status: decoded.status
    };

    // Attach token for logout functionality
    req.token = token;

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Authentication failed. Please try again.'
      }
    });
  }
};

/**
 * Optional middleware - extracts user if token exists, but doesn't require it
 * Useful for endpoints that work differently for authenticated vs anonymous users
 */
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user data
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    // Try to verify token
    try {
      const decoded = jwt.verify(token, jwtConfig.secret, {
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience
      });

      req.user = {
        id: decoded.userId,
        email: decoded.email,
        tenantId: decoded.tenantId,
        role: decoded.role,
        status: decoded.status
      };
      req.token = token;
    } catch (jwtError) {
      // Token invalid or expired, continue without user data
      req.user = null;
    }

    next();
  } catch (err) {
    // On error, continue without user data
    req.user = null;
    next();
  }
};

/**
 * Middleware to check if user's account status is active
 * Should be used after authMiddleware
 */
const checkActiveStatus = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: ERROR_CODES.UNAUTHORIZED,
        message: 'Authentication required'
      }
    });
  }

  if (req.user.status !== 'active') {
    return res.status(403).json({
      success: false,
      error: {
        code: ERROR_CODES.ACCOUNT_INACTIVE,
        message: `Your account is ${req.user.status}. Please contact your administrator.`
      }
    });
  }

  next();
};

module.exports = authMiddleware;
module.exports.optionalAuth = optionalAuthMiddleware;
module.exports.checkActiveStatus = checkActiveStatus;
