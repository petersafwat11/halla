/**
 * Audit log helper for non-HTTP code paths (cron jobs, webhook workers).
 *
 * Phase 1b: Express middleware lives in `src/shared/middleware/auditLog.js`
 * and is the primary writer. This module is for places that don't have a
 * `res` object — schedule fires, queue consumers, internal admin actions.
 *
 * Failures are swallowed (the underlying `AuditLog.log` already catches
 * mongoose errors) — audit logging must never break the operation it
 * observes.
 */

const AuditLog = require("../../../models/AuditLogModel");

/**
 * Log an audit entry.
 * @param {Object} params
 * @param {string} params.action       - dot-notation action key, e.g. "vendor.status_change"
 * @param {Object} [params.actor]      - user document or { _id, role }
 * @param {string} [params.targetType] - one of the AuditLogModel enum values
 * @param {string} [params.targetId]
 * @param {string} [params.whitelabelId]
 * @param {Object} [params.changes]
 * @param {Object} [params.metadata]
 * @param {Object} [params.request]    - { method, path, requestId }
 * @param {string} [params.ip]
 * @param {string} [params.userAgent]
 * @param {string} [params.status="success"]
 * @returns {Promise<void>}
 */
async function logAudit(params = {}) {
  const {
    action,
    actor,
    targetType,
    targetId,
    whitelabelId,
    changes,
    metadata,
    request,
    ip,
    userAgent,
    status = "success",
    error,
  } = params;

  if (!action) return;

  await AuditLog.log({
    action,
    performedBy: actor?._id || actor?.id || null,
    performedByRole: actor?.role || "system",
    targetType,
    targetId,
    whitelabelId,
    changes,
    metadata,
    request,
    ipAddress: ip,
    userAgent,
    status,
    error,
  });
}

module.exports = { logAudit };
