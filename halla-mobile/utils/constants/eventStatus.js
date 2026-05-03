/**
 * Event status enum (L-8 — mobile constant).
 *
 * Mirrors `labbe-backend-/src/shared/constants/status.js → EVENT_STATUS`
 * and `labbe/utils/constants/eventStatus.js`.
 *
 * Keep in sync with the backend enum:
 *   draft, scheduled, live, completed, cancelled, failed
 */

export const EVENT_STATUS = Object.freeze({
  DRAFT: "draft",
  SCHEDULED: "scheduled",
  LIVE: "live",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  FAILED: "failed",
});

export const EVENT_STATUSES = Object.freeze(Object.values(EVENT_STATUS));

export const EVENT_STATUS_GROUPS = Object.freeze({
  PRE_LAUNCH: [EVENT_STATUS.DRAFT, EVENT_STATUS.SCHEDULED],
  ACTIVE: [EVENT_STATUS.LIVE],
  TERMINAL: [EVENT_STATUS.COMPLETED, EVENT_STATUS.CANCELLED, EVENT_STATUS.FAILED],
});

export default EVENT_STATUS;
