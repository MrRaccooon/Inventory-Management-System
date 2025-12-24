/**
 * File: index.js
 * Purpose: Export all database schemas
 * Layer: DB
 * Notes:
 * - Central export point for all schemas
 * - Follows project coding standards
 */

const { tenants, tenantStatusEnum } = require('./tenants.schema.js');
const { users, userRoleEnum, userStatusEnum } = require('./users.schema.js');
const { auditLogs } = require('./audit_logs.schema.js');

module.exports = {
  tenants,
  tenantStatusEnum,
  users,
  userRoleEnum,
  userStatusEnum,
  auditLogs
};
