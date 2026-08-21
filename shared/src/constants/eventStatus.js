/**
 * Event and guest status enums — mirror of `halaa-backend/src/shared/constants/status.js`.
 */

export const EVENT_STATUS = Object.freeze({
  PENDING_SCHEDULING: "pending_scheduling",
  PENDING_REVIEW: "pending_review",
  SCHEDULED: "scheduled",
  LIVE: "live",
  PUBLISHED: "published",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  ARCHIVED: "archived",
  FAILED: "failed",
  DELETED: "deleted",
});

export const EVENT_STATUSES = Object.freeze(Object.values(EVENT_STATUS));

export const EVENT_STATUS_GROUPS = Object.freeze({
  PRE_LAUNCH: Object.freeze([
    EVENT_STATUS.PENDING_SCHEDULING,
    EVENT_STATUS.PENDING_REVIEW,
    EVENT_STATUS.SCHEDULED,
    EVENT_STATUS.PUBLISHED,
  ]),
  ACTIVE: Object.freeze([
    EVENT_STATUS.LIVE,
    EVENT_STATUS.SCHEDULED,
    EVENT_STATUS.PUBLISHED,
  ]),
  TERMINAL: Object.freeze([
    EVENT_STATUS.COMPLETED,
    EVENT_STATUS.CANCELLED,
    EVENT_STATUS.FAILED,
    EVENT_STATUS.DELETED,
    EVENT_STATUS.ARCHIVED,
  ]),
});

/**
 * Guest RSVP status
 */
export const RSVP_STATUS = Object.freeze({
  PENDING: "pending",
  CONFIRMED: "confirmed",
  DECLINED: "declined",
});

/**
 * Guest lifecycle status
 */
export const GUEST_STATUS = Object.freeze({
  INVITED: "invited",
  CONFIRMED: "confirmed",
  DECLINED: "declined",
  CHECKED_IN: "checked_in",
  NO_SHOW: "no_show",
});

/**
 * Guest check-in status
 */
export const CHECKIN_STATUS = Object.freeze({
  NOT_CHECKED_IN: "not_checked_in",
  CHECKED_IN: "checked_in",
  NO_SHOW: "no_show",
});

/**
 * Canonical RSVP Buckets (EVT-16 root cause resolution)
 * Maps all variations of guest states to authoritative reporting buckets.
 */
export const RSVP_BUCKETS = Object.freeze({
  PENDING: Object.freeze(["invited", "pending"]),
  CONFIRMED: Object.freeze(["confirmed", "checked_in"]),
  DECLINED: Object.freeze(["declined"]),
  ATTENDED: Object.freeze(["checked_in"]),
  NO_SHOW: Object.freeze(["no_show"]),
});

/**
 * Classifies any guest status string into a canonical RSVP bucket:
 * 'pending' | 'confirmed' | 'declined' | 'attended' | 'no_show'
 */
export const classifyRsvpBucket = (status) => {
  if (!status) return "pending";
  const s = String(status).toLowerCase().trim();
  if (RSVP_BUCKETS.ATTENDED.includes(s)) return "attended";
  if (RSVP_BUCKETS.CONFIRMED.includes(s)) return "confirmed";
  if (RSVP_BUCKETS.DECLINED.includes(s)) return "declined";
  if (RSVP_BUCKETS.NO_SHOW.includes(s)) return "no_show";
  if (RSVP_BUCKETS.PENDING.includes(s)) return "pending";
  return "pending";
};

export default EVENT_STATUS;

