/**
 * File: audit.service.js
 * Purpose: Audit logging service
 * Layer: Service
 * Notes:
 * - Creates audit log entries
 * - No HTTP objects
 * - Follows project coding standards
 */

const { db } = require('../config/database.config');
const { auditLogs } = require('../db/schema');

/**
 * Create audit log entry
 */
const createAuditLog = async (data) => {
  try {
    const [log] = await db.insert(auditLogs).values({
      tenant_id: data.tenantId,      // ✅ Match schema: tenant_id
      user_id: data.userId,          // ✅ Match schema: user_id
      action: data.action,
      entity: data.entity,
      entity_id: data.entityId,      // ✅ Match schema: entity_id
      payload: data.payload,
      ip_address: data.ipAddress,    // ✅ Match schema: ip_address
      user_agent: data.userAgent     // ✅ Match schema: user_agent
    }).returning();

    return log;
  } catch (err) {
    console.error('Audit log creation failed:', err);
    // Don't throw - audit log failure shouldn't break the request
    return null;
  }
};

module.exports = {
  createAuditLog
};
