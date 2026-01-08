/**
 * File: catchAsync.js
 * 
 * Purpose: Async error wrapper for controllers. Catches errors and passes to Express next().
 *          Controllers MUST wrap async handlers with this.
 * 
 * Layer: Utility
 * 
 * Notes:
 * - Controllers: const handler = catchAsync(async (req, res, next) => {...});
 * - Preserves original error stack in development
 * - Works with ApiError and native Errors
 * - No business logic, pure error forwarding
 * - Used in routes: router.get('/', catchAsync(productController.getProducts));
 */

const catchAsync = (fn) => {
  /**
   * Wraps async controller handlers, catching errors and calling next(err)
   * 
   * @param {Function} fn - Async controller function (req, res, next) => Promise
   * @returns {Function} Wrapped Express handler
   */
  return (req, res, next) => {
    // Convert to Promise if not already (handles sync errors too)
    Promise.resolve(fn(req, res, next)).catch((err) => {
      // Preserve full stack trace in development
      if (process.env.NODE_ENV === 'development' && err.stack) {
        err.stackTrace = err.stack;
      }
      
      // Forward to error middleware (error.middleware.js)
      return next(err);
    });
  };
};

module.exports = catchAsync;
