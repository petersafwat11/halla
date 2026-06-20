/**
 * Events module shared constants — Phase 4b W0-RBAC + Phase 4d W0-ATOMIC.
 *
 * Extracted (post-review polish) so the capacity-guard error code lives
 * in one place — both `updateGuestList` and `updateEventStep2` now
 * import the same string instead of duplicating the literal.
 */

/**
 * Thrown when a host attempts to shrink the event's guestList below
 * the count of guests who have already RSVP'd `confirmed` or
 * `checked_in`. The FE surfaces this through the existing toast layer.
 */
const GUEST_LIST_BELOW_CONFIRMED = "GUEST_LIST_BELOW_CONFIRMED";

/**
 * Thrown when a host schedules a launch closer than the configured
 * minimum lead time. See `messaging.service.scheduleBulkSend`.
 */
const SCHEDULE_TOO_SOON = "SCHEDULE_TOO_SOON";

/**
 * Thrown when a host schedules a launch too close to the event itself —
 * i.e. the scheduled bulk send lands later than `eventInstant − 3 days`.
 * The initial invitations must go out at least 3 days before the event.
 */
const SCHEDULE_TOO_LATE = "SCHEDULE_TOO_LATE";

/**
 * Thrown when the event date is so soon that no valid scheduling window
 * exists (`now + minLead(plan) + 3 days > eventInstant`). The host must
 * pick a later event date. minLead is 15min (trial) / 24h (paid).
 */
const EVENT_DATE_TOO_SOON = "EVENT_DATE_TOO_SOON";

/**
 * Thrown when a customized reminder instant falls outside the allowed
 * range `[scheduledSendInstant, eventInstant − 24h]`.
 */
const REMINDER_OUT_OF_RANGE = "REMINDER_OUT_OF_RANGE";

/**
 * The initial bulk send must go out at least this many days before the
 * event instant. Defines both the upper bound of the schedule window
 * (`eventInstant − SCHEDULE_MAX_LEAD_DAYS`) and part of the event-date
 * floor (`now + minLead + SCHEDULE_MAX_LEAD_DAYS`).
 */
const SCHEDULE_MAX_LEAD_DAYS = 3;

/**
 * Thrown when the proposed scheduledDate / scheduledTime cannot be
 * parsed as a real date.
 */
const SCHEDULE_INVALID = "SCHEDULE_INVALID";

/**
 * FLOW-13-F01: Thrown when a host attempts to modify locked fields
 * (date, time, location) within 24h of a scheduled event's launch.
 */
const EVENT_EDIT_LOCKED = "EVENT_EDIT_LOCKED";

/**
 * Generic host-limit error code (reserved for plan-based host caps).
 */
const HOST_LIMIT_EXCEEDED = "HOST_LIMIT_EXCEEDED";

/**
 * Statuses that mean an event no longer "counts against the plan".
 * Cancelled and deleted events are excluded from every event-count check
 * (plan-limit counting AND the per-event active-event gate). Everything
 * else — including `pending_scheduling` (the default status of a
 * freshly-created event) — counts as occupying the plan.
 */
const NON_COUNTING_EVENT_STATUSES = ['cancelled', 'deleted'];

/**
 * Mongo sub-filter that selects events which count against the plan.
 * Compose it into a scoped query, e.g.
 *   Event.countDocuments({ host, createdAt: { $gte }, ...countsAgainstPlanStatusFilter() })
 *   Event.countDocuments({ subscriptionId, ...countsAgainstPlanStatusFilter() })
 * @returns {{ status: { $nin: string[] } }}
 */
const countsAgainstPlanStatusFilter = () => ({
  status: { $nin: NON_COUNTING_EVENT_STATUSES },
});

module.exports = {
  GUEST_LIST_BELOW_CONFIRMED,
  SCHEDULE_TOO_SOON,
  SCHEDULE_TOO_LATE,
  EVENT_DATE_TOO_SOON,
  REMINDER_OUT_OF_RANGE,
  SCHEDULE_MAX_LEAD_DAYS,
  SCHEDULE_INVALID,
  EVENT_EDIT_LOCKED,
  HOST_LIMIT_EXCEEDED,
  NON_COUNTING_EVENT_STATUSES,
  countsAgainstPlanStatusFilter,
};
