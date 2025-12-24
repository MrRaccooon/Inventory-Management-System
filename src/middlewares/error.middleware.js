/**
 * File: error.middleware.js
 * Purpose: Global error handler
 * Layer: Middleware
 * Notes:
 * - Maps error codes to HTTP status codes
 * - Logs errors
 * - Returns standardized error response
 * - Follows project coding standards
 */

const { ERROR_CODES } = require('../utils/constants');

/**
 * Map error code to HTTP status
 */
const errorStatusMap = {
  [ERROR_CODES.VALIDATION_ERROR]: 400,
  [ERROR_CODES.INVALID_CREDENTIALS]: 401,
  [ERROR_CODES.UNAUTHORIZED]: 401,
  [ERROR_CODES.INVALID_TOKEN]: 401,
  [ERROR_CODES.TOKEN_EXPIRED]: 401,
  [ERROR_CODES.EMAIL_NOT_VERIFIED]: 403,
  [ERROR_CODES.ACCOUNT_INACTIVE]: 403,
  [ERROR_CODES.FORBIDDEN]: 403,
  [ERROR_CODES.USER_NOT_FOUND]: 404,
  [ERROR_CODES.NOT_FOUND]: 404,
  [ERROR_CODES.EMAIL_ALREADY_EXISTS]: 409,
  [ERROR_CODES.SUBSCRIPTION_LIMIT_REACHED]: 409,
  [ERROR_CODES.TOO_MANY_REQUESTS]: 429,
  [ERROR_CODES.INTERNAL_ERROR]: 500
};

/**
 * Global error handler middleware
 */
const errorMiddleware = (err, req, res, next) => {
  // Log error
  console.error('Error:', {
    code: err.code || 'UNKNOWN',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });

  // Get status code
  const statusCode = errorStatusMap[err.code] || 500;

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || ERROR_CODES.INTERNAL_ERROR,
      message: err.message || 'An unexpected error occurred'
    }
  });
};

module.exports = errorMiddleware;
