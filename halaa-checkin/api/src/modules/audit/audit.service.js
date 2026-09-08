/**
 * @halaa-checkin/api
 * Audit Service.
 * Appends operational audit records in mutation transactions.
 */

import { Audit } from './audit.model.js';

export const AuditService = {
  /**
   * Record an immutable audit log entry.
   *
   * @param {object} params
   * @param {string | import('mongoose').Types.ObjectId} [params.eventId]
   * @param {string | import('mongoose').Types.ObjectId} [params.guestId]
   * @param {string | import('mongoose').Types.ObjectId} params.actorId
   * @param {string} params.actorName
   * @param {string} params.action
   * @param {string} [params.reason]
   * @param {object} [params.changes]
   * @param {string} [params.requestId]
   * @param {import('mongoose').ClientSession} [params.session]
   * @returns {Promise<import('./audit.model.js').Audit>}
   */
  async record({
    eventId = null,
    guestId = null,
    actorId,
    actorName,
    action,
    reason = null,
    changes = null,
    requestId = null,
    session = null,
  }) {
    const auditDoc = new Audit({
      eventId,
      guestId,
      actorId,
      actorName,
      action,
      timestamp: new Date(),
      reason,
      changes,
      requestId,
    });

    await auditDoc.save({ session });
    return auditDoc;
  },
};
