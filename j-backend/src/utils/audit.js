/**
 * Audit logging utilities.
 * Records all important actions for compliance and debugging.
 */
const { v4: uuidv4 } = require('uuid');

/**
 * Log an action to the audit log.
 * @param {Object} params - Audit log parameters
 * @returns {Promise<Object>} Created AuditLog record
 */
const logAction = async ({
  action,
  userId = null,
  shopId = null,
  objectType = null,
  objectId = null,
  payload = {},
}) => {
  const { AuditLog } = require('../models');
  
  const auditLog = await AuditLog.create({
    id: uuidv4(),
    shop_id: shopId,
    user_id: userId,
    action,
    object_type: objectType,
    object_id: objectId,
    payload,
  });
  
  return auditLog;
};

module.exports = {
  logAction,
};

