const { AuditLog } = require('../models');
const logger = require('../utils/logger');

/**
 * Record an activity in the audit log. Never throws — auditing failures must
 * not break the main flow.
 *
 * @param {object} params
 * @param {number} [params.userId]
 * @param {string} params.action       e.g. 'LOGIN', 'UPLOAD', 'IMPORT', 'REIMPORT'
 * @param {string} [params.entityType] e.g. 'PoDocument', 'ImportJob'
 * @param {number} [params.entityId]
 * @param {object} [params.details]
 * @param {string} [params.ipAddress]
 * @param {object} [options]           e.g. { transaction }
 */
async function log({ userId, action, entityType, entityId, details, ipAddress }, options = {}) {
  try {
    await AuditLog.create(
      { userId, action, entityType, entityId, details, ipAddress },
      options
    );
  } catch (err) {
    logger.error('Failed to write audit log:', err.message);
  }
}

module.exports = { log };
