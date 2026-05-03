/**
 * Event status enum (L-8 — FE constant).
 *
 * Mirrors `labbe-backend-/src/shared/constants/status.js → EVENT_STATUS`.
 * Frontend code should import from here instead of using string literals
 * — that way a backend rename surfaces as a TS / lint failure rather
 * than a silent UI bug.
 *
 * Keep this file in sync with the backend enum:
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

/** Convenience set for status checks. */
export const EVENT_STATUSES = Object.freeze(Object.values(EVENT_STATUS));

/**
 * Status groupings the UI uses repeatedly.
 */
export const EVENT_STATUS_GROUPS = Object.freeze({
  // Pre-launch states (host can still edit guest list, content, etc.).
  PRE_LAUNCH: [EVENT_STATUS.DRAFT, EVENT_STATUS.SCHEDULED],
  // Post-launch active states.
  ACTIVE: [EVENT_STATUS.LIVE],
  // Terminal states (no more transitions).
  TERMINAL: [EVENT_STATUS.COMPLETED, EVENT_STATUS.CANCELLED, EVENT_STATUS.FAILED],
});

export default EVENT_STATUS;
