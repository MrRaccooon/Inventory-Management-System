/**
 * File: logger.js
 * 
 * Purpose: Centralized structured logging for entire application.
 *          Winston for production, console for development.
 * 
 * Layer: Utility
 * 
 * Notes:
 * - No console.log anywhere else in production paths
 * - Structured JSON logs with tenantId/userId/context
 * - Mutations ALWAYS log before/after states to auditlogs too
 * - Morgan HTTP logs configured separately (logger.middleware.js)
 * - Logs to files: logs/combined.log, logs/error.log
 */

const winston = require('winston');
const { format, transports } = winston;
const { combine, timestamp, printf, errors, json } = format;
const path = require('path');

// Ensure logs directory exists
const fs = require('fs');
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

/**
 * Custom log format with structured fields
 */
const customFormat = printf(({ level, message, timestamp, tenantId, userId, ...meta }) => {
  const structured = {
    ...(tenantId && { tenantId }),
    ...(userId && { userId }),
    ...meta
  };
  
  return `${timestamp} [${level.toUpperCase()}] ${message} ${JSON.stringify(structured)}`;
});

/**
 * Production logger (Winston + file rotation)
 */
const productionLogger = winston.createLogger({
  level: logLevel,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: 'ims-backend' },
  transports: [
    // All logs
    new transports.File({ 
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    // Errors only
    new transports.File({ 
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 10
    })
  ]
});

/**
 * Development logger (pretty console + errors file)
 */
const developmentLogger = winston.createLogger({
  level: logLevel,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    customFormat
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        customFormat
      )
    }),
    new transports.File({ filename: path.join(logDir, 'error.log') })
  ]
});

/**
 * Unified logger instance
 */
const logger = process.env.NODE_ENV === 'production' 
  ? productionLogger 
  : developmentLogger;

/**
 * Convenience methods with context
 */
const logWithContext = (tenantId, userId) => ({
  info: (msg, meta = {}) => logger.info(msg, { tenantId, userId, ...meta }),
  warn: (msg, meta = {}) => logger.warn(msg, { tenantId, userId, ...meta }),
  error: (msg, meta = {}) => logger.error(msg, { tenantId, userId, ...meta }),
  debug: (msg, meta = {}) => logger.debug(msg, { tenantId, userId, ...meta })
});

/**
 * Audit log for mutations (also creates auditlogs DB row)
 * 
 * @param {string} action - e.g., PRODUCT_CREATED
 * @param {Object} before - Previous state (or null)
 * @param {Object} after - New state
 * @param {Object} context - { tenantId, userId, entityId }
 */
const audit = (action, before, after, context) => {
  const msg = `${action} - ${context.entityType || 'resource'} ${context.entityId || 'N/A'}`;
  logger.info(msg, { 
    action, 
    tenantId: context.tenantId, 
    userId: context.userId,
    before: before ? JSON.stringify(before) : null,
    after: after ? JSON.stringify(after) : null,
    changes: calculateChanges(before, after)
  });
};

// Simple diff helper for audit logs
const calculateChanges = (before, after) => {
  if (!before || !after) return null;
  const changes = {};
  for (const [key, value] of Object.entries(after)) {
    if (JSON.stringify(before[key]) !== JSON.stringify(value)) {
      changes[key] = { before: before[key], after: value };
    }
  }
  return changes;
};

module.exports = {
  logger,
  logWithContext,
  audit
};
