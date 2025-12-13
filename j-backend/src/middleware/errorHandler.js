/**
 * Global error handling middleware.
 */
const config = require('../config');

/**
 * Error handler middleware.
 */
const errorHandler = (err, req, res, _next) => {
  console.error('Error:', err);
  
  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      detail: 'Validation error',
      errors: err.errors.map(e => ({
        field: e.path,
        message: e.message,
      })),
    });
  }
  
  // Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      detail: 'Duplicate entry',
      errors: err.errors.map(e => ({
        field: e.path,
        message: e.message,
      })),
    });
  }
  
  // Joi validation errors
  if (err.isJoi) {
    return res.status(400).json({
      detail: 'Validation error',
      errors: err.details.map(d => ({
        field: d.path.join('.'),
        message: d.message,
      })),
    });
  }
  
  // Custom application errors
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      detail: err.message,
      ...(config.DEBUG && { stack: err.stack }),
    });
  }
  
  // Default error response
  res.status(500).json({
    detail: 'Internal server error',
    message: config.DEBUG ? err.message : 'An unexpected error occurred',
  });
};

/**
 * Not found handler.
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    detail: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
};

