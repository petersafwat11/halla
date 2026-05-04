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
 * FLOW-04-F03: Thrown when a whitelabel admin attempts to create a host
 * but the whitelabel's plan maxHosts limit would be exceeded.
 */
const HOST_LIMIT_EXCEEDED = "HOST_LIMIT_EXCEEDED";

module.exports = {
  GUEST_LIST_BELOW_CONFIRMED,
  SCHEDULE_TOO_SOON,
  SCHEDULE_INVALID,
  EVENT_EDIT_LOCKED,
  HOST_LIMIT_EXCEEDED,
};
