/**
 * Event status enum — frontend mirror of `halaa-backend/src/shared/constants/status.js → EVENT_STATUS`.
 *
 * Frontend code should import from here instead of using string literals
 * so a backend rename surfaces as a build / lint failure rather than a
 * silent UI bug. The FE intentionally exposes the subset of statuses the
 * UI actually renders; backend has additional internal states
 * (pending_review, published, archived, deleted) that are not user-facing.
 */

export const EVENT_STATUS = Object.freeze({
  PENDING_SCHEDULING: "pending_scheduling",
  SCHEDULED: "scheduled",
  LIVE: "live",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  FAILED: "failed",
});

export const EVENT_STATUSES = Object.freeze(Object.values(EVENT_STATUS));

export const EVENT_STATUS_GROUPS = Object.freeze({
  PRE_LAUNCH: [EVENT_STATUS.PENDING_SCHEDULING, EVENT_STATUS.SCHEDULED],
  ACTIVE: [EVENT_STATUS.LIVE],
  TERMINAL: [EVENT_STATUS.COMPLETED, EVENT_STATUS.CANCELLED, EVENT_STATUS.FAILED],
});

export default EVENT_STATUS;
