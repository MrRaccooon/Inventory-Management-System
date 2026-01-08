/**
 * File: audit.middleware.js
 * Purpose: Audit logging for sensitive actions
 * Layer: Middleware
 * Notes:
 * - Logs actions to auditlogs table
 * - Captures IP address, user agent, and action details
 * - Follows project coding standards
 */

const auditService = require('../services/audit.service');
const { AUDIT_ACTIONS } = require('../utils/constants');

/**
 * Audit middleware factory
 * @param {string} action - Action type from AUDIT_ACTIONS
 * @returns {Function} Express middleware
 */
const auditMiddleware = (action) => {
  return async (req, res, next) => {
    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);

    res.json = async function (data) {
      try {
        // Only log successful operations (status 2xx)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Extract audit information
          const auditData = {
            tenantId: req.user?.tenantId || null,
            userId: req.user?.id || null,
            action: action,
            entity: getEntityFromPath(req.path),
            entityId: getEntityIdFromRequest(req),
            payload: {
              method: req.method,
              path: req.path,
              body: sanitizeRequestBody(req.body),
              query: req.query
            },
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent')
          };

          // Log asynchronously without blocking response
          auditService.createAuditLog(auditData).catch((err) => {
            console.error('Audit log creation failed:', err);
          });
        }
      } catch (err) {
        console.error('Audit middleware error:', err);
      }

      // Send original response
      return originalJson(data);
    };

    next();
  };
};

/**
 * Extract entity name from request path
 */
const getEntityFromPath = (path) => {
  const parts = path.split('/').filter(Boolean);
  // Typically: /api/v1/{entity}/...
  return parts[2] || 'unknown';
};

/**
 * Extract entity ID from request
 */
const getEntityIdFromRequest = (req) => {
  return req.params.id || req.body.id || null;
};

/**
 * Sanitize request body (remove sensitive fields)
 */
const sanitizeRequestBody = (body) => {
  if (!body) return null;

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'currentPassword', 'newPassword', 'token', 'refreshToken'];

  sensitiveFields.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });

  return sanitized;
};

module.exports = auditMiddleware;
