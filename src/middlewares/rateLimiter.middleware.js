/**
 * File: rateLimiter.middleware.js
 * Purpose: Rate limiting for API endpoints
 * Layer: Middleware
 * Notes:
 * - Prevents brute force attacks
 * - Different limits for different endpoints
 * - Uses express-rate-limit
 * - Follows project coding standards
 */

const rateLimit = require('express-rate-limit');
const { authConfig } = require('../config/auth.config');
const { ERROR_CODES } = require('../utils/constants');

/**
 * Create rate limiter with custom config
 * @param {string} type - Type of rate limit (login, register, etc.)
 * @returns {Function} Express middleware
 */
const createRateLimiter = (type) => {
  const config = authConfig.rateLimits[type];

  if (!config) {
    throw new Error(`Rate limit configuration not found for type: ${type}`);
  }

  return rateLimit({
    windowMs: config.windowMs,
    max: config.maxAttempts,
    message: {
      success: false,
      error: {
        code: ERROR_CODES.TOO_MANY_REQUESTS,
        message: `Too many ${type} attempts. Please try again later.`
      }
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: ERROR_CODES.TOO_MANY_REQUESTS,
          message: `Too many ${type} attempts. Please try again after ${Math.ceil(config.windowMs / 60000)} minutes.`
        }
      });
    },
    // Skip rate limiting for successful requests (optional)
    skipSuccessfulRequests: false,
    // Skip rate limiting for failed requests (optional)
    skipFailedRequests: false
  });
};

/**
 * Factory function to get rate limiter by type
 */
const rateLimiterMiddleware = (type) => {
  return createRateLimiter(type);
};

module.exports = rateLimiterMiddleware;
