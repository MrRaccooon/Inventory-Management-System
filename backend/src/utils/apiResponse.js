/**
 * File: apiResponse.js
 * 
 * Purpose: Standardized success response wrapper for all controllers.
 *          Ensures consistent JSON shape across entire API.
 * 
 * Layer: Utility
 * 
 * Notes:
 * - Controllers MUST use this for success responses
 * - { success: true, data: {}, meta: {} } format exactly
 * - Pagination meta auto-generated when page/pageSize provided
 * - No error responses here (use error.middleware.js)
 * - No business logic, pure formatting
 */

const buildMeta = (req = {}) => {
  /**
   * Builds pagination/filter meta for responses
   * @param {Object} req - Express request (optional)
   * @returns {Object} meta object
   */
  const { page = 1, pageSize = 20, total = 0 } = req.query || {};
  
  const pageNum = parseInt(page, 10);
  const size = parseInt(pageSize, 10);
  const totalPages = Math.ceil(total / size);
  
  return {
    page: pageNum,
    pageSize: size,
    total,
    totalPages,
    hasNext: pageNum < totalPages,
    hasPrev: pageNum > 1
  };
};

/**
 * Creates standardized success response
 * 
 * @param {Object|Array|null} data - Response payload
 * @param {Object} [meta={}] - Optional metadata (pagination, filters)
 * @param {Object} [req] - Express request for auto-pagination
 * @returns {Object} Formatted response object
 */
const successResponse = (data, meta = {}, req) => {
  // Auto-build pagination if query params present and no meta.total
  if (req?.query?.page && !meta.total) {
    meta = buildMeta(req);
  }
  
  return {
    success: true,
    data: data || null,
    meta: Object.keys(meta).length ? meta : {}
  };
};

/**
 * Convenience for simple success without data
 * 
 * @param {string} [message='Success'] - Optional message
 * @param {Object} [meta={}] - Optional metadata
 * @returns {Object} Formatted response
 */
const successMessage = (message = 'Success', meta = {}) => ({
  success: true,
  data: null,
  meta: { message, ...meta }
});

/**
 * Convenience for paginated list responses
 * 
 * @param {Array} items - Array of items
 * @param {number} total - Total count
 * @param {Object} [req] - Express request
 * @returns {Object} Formatted response with pagination
 */
const paginatedResponse = (items, total, req) => {
  const meta = buildMeta(req);
  meta.total = total;
  
  return successResponse(items, meta, req);
};

module.exports = {
  successResponse,
  successMessage,
  paginatedResponse,
  buildMeta
};
