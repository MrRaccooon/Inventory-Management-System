/**
 * File: apiError.js
 * 
 * Purpose: Creates standardized domain error objects thrown by services.
 *          Central error middleware maps error.code to HTTP status.
 * 
 * Layer: Utility
 * 
 * Notes:
 * - Framework-agnostic plain JS objects
 * - Used by services only (controllers/middlewares catch and forward)
 * - No HTTP status codes or res.json here
 * - Follows project error response format exactly
 * - No cross-layer imports
 */

class ApiError extends Error {
  /**
   * Creates a structured domain error for services to throw
   * 
   * @param {string} code - Error code (e.g., 'INSUFFICIENT_STOCK', 'VALIDATION_ERROR')
   * @param {string} message - Human-readable message
   * @param {object} [metadata={}] - Optional context (productId, fieldName, etc.)
   * @param {number} [status=500] - HTTP status for mapping (default internal server error)
   */
  constructor(code, message, metadata = {}, status = 500) {
    super(message);
    
    this.name = 'ApiError';
    this.code = code;
    this.message = message;
    this.metadata = metadata;
    this.status = status;
    
    // Ensure stack trace in non-production
    if (process.env.NODE_ENV === 'development') {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Common error codes as class methods for convenience
ApiError.NOT_FOUND = (message, metadata = {}) => 
  new ApiError('NOT_FOUND', message, metadata, 404);

ApiError.VALIDATION_ERROR = (message, metadata = {}) => 
  new ApiError('VALIDATION_ERROR', message, metadata, 400);

ApiError.UNAUTHORIZED = (message, metadata = {}) => 
  new ApiError('UNAUTHORIZED', message, metadata, 401);

ApiError.FORBIDDEN = (message, metadata = {}) => 
  new ApiError('FORBIDDEN', message, metadata, 403);

ApiError.INSUFFICIENT_STOCK = (message, metadata = {}) => 
  new ApiError('INSUFFICIENT_STOCK', message, metadata, 409);

ApiError.DUPLICATE_RECORD = (message, metadata = {}) => 
  new ApiError('DUPLICATE_RECORD', message, metadata, 409);

module.exports = ApiError;
