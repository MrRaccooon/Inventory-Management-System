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
const { ERROR_CODES } = require('../utils/constants');

/**
 * Rate limit configurations
 * All set to 30 seconds for testing
 */
const RATE_LIMIT_CONFIGS = {
  login: {
    windowMs: 30 * 1000, // 30 seconds
    maxAttempts: 100,
    message: 'Too many login attempts. Please try again after 30 seconds.'
  },
  register: {
    windowMs: 30 * 1000, // 30 seconds
    maxAttempts: 100,
    message: 'Too many register attempts. Please try again after 30 seconds.'
  },
  refresh: {
    windowMs: 30 * 1000, // 30 seconds
    maxAttempts: 100,
    message: 'Too many token refresh attempts. Please try again after 30 seconds.'
  },
  forgotPassword: {
    windowMs: 30 * 1000, // 30 seconds
    maxAttempts: 100,
    message: 'Too many password reset requests. Please try again after 30 seconds.'
  },
  resetPassword: {
    windowMs: 30 * 1000, // 30 seconds
    maxAttempts: 100,
    message: 'Too many password reset attempts. Please try again after 30 seconds.'
  },
  changePassword: {
    windowMs: 30 * 1000, // 30 seconds
    maxAttempts: 100,
    message: 'Too many password change attempts. Please try again after 30 seconds.'
  },
  api: {
    windowMs: 30 * 1000, // 30 seconds
    maxAttempts: 100,
    message: 'Too many requests. Please try again after 30 seconds.'
  }
};

/**
 * Create rate limiter with custom config
 * @param {string} type - Type of rate limit (login, register, etc.)
 * @returns {Function} Express middleware
 */
const createRateLimiter = (type) => {
  const config = RATE_LIMIT_CONFIGS[type];

  if (!config) {
    console.warn(`Rate limit configuration not found for type: ${type}, using default 'api' config`);
    config = RATE_LIMIT_CONFIGS.api;
  }

  return rateLimit({
    windowMs: config.windowMs,
    max: config.maxAttempts,
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: ERROR_CODES.TOO_MANY_REQUESTS,
          message: config.message
        }
      });
    },
    // Don't skip any requests - count all attempts
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    // Use store (default memory store)
    store: undefined // Uses default MemoryStore
  });
};

/**
 * Factory function to get rate limiter by type
 * @param {string} type - Type of rate limit
 * @returns {Function} Express middleware
 */
const rateLimiterMiddleware = (type) => {
  return createRateLimiter(type);
};

module.exports = rateLimiterMiddleware;
