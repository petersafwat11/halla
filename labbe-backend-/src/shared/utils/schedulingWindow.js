/**
 * Scheduling-window utility — Phase 3 (trial-vs-paid windows + event-date floors).
 *
 * Single source of truth for the scheduling math shared across:
 *   - messaging.schedule.service.scheduleBulkSend  (window: SOON / LATE)
 *   - events.crud.service.createEvent              (floor)
 *   - events.settings.service.updateEventDetails   (floor + re-validate stored send)
 *   - events.settings.service.updateReminderSettings (paid reminder range)
 *   - admin.events.service.updateEventFull         (floor + re-validate stored send)
 *
 * RULES (a "scheduled send" is when the initial bulk invitations go out):
 *   - minLead(plan):  TRIAL = 15 minutes,  PAID = 24 hours.
 *   - Scheduled-send window: [ now + minLead, eventInstant − 3 days ].
 *       below min  → SCHEDULE_TOO_SOON
 *       above max  → SCHEDULE_TOO_LATE
 *   - Event-date floor: a valid window must exist, i.e.
 *       eventInstant ≥ now + minLead + 3 days,  else EVENT_DATE_TOO_SOON.
 *   - Normal/auto reminder:
 *       TRIAL = scheduledSend + 10 minutes.
 *       PAID  = default eventInstant − 48h, customizable in
 *               [ scheduledSendInstant, eventInstant − 24h ].
 *
 * All timezone math goes through `parseDateTime` (the same Asia/Riyadh
 * wall-clock → UTC conversion used by `parseEventTime`). No hand-rolled
 * UTC offsets here.
 */

const config = require('../../config');
const { isTrialPlan } = require('../constants/plans');
const { parseDateTime, parseEventTime } = require('./timezone');
const { AppError } = require('../errors');
const {
  SCHEDULE_TOO_SOON,
  SCHEDULE_TOO_LATE,
  EVENT_DATE_TOO_SOON,
  SCHEDULE_INVALID,
  SCHEDULE_MAX_LEAD_DAYS,
} = require('../constants/events');

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

const TRIAL_REMINDER_OFFSET_MS = 10 * MS_PER_MINUTE;
const PAID_REMINDER_DEFAULT_OFFSET_MS = 48 * MS_PER_HOUR;
const PAID_REMINDER_MIN_GAP_MS = 24 * MS_PER_HOUR; // reminder must be ≤ event − 24h

/** Pre-event cutoff (ms): the initial send must land at least this far before the event. */
const maxLeadMs = () => SCHEDULE_MAX_LEAD_DAYS * MS_PER_DAY;

/**
 * Minimum lead time in ms between `now` and the scheduled send.
 * TRIAL = 15 min (env-driven), PAID = 24h (env-driven).
 * Defaults to PAID when the plan is indeterminate (fail-closed: paid is the
 * stricter floor, so an unknown plan can't bypass the 24h minimum).
 *
 * @param {boolean} isTrial
 * @returns {number}
 */
function minLeadMs(isTrial) {
  return isTrial
    ? (config?.events?.trialScheduleMinLeadMinutes ?? 15) * MS_PER_MINUTE
    : (config?.events?.scheduleMinLeadHours ?? 24) * MS_PER_HOUR;
}

/**
 * Resolve whether a populated plan ref is the trial plan.
 * Accepts a plan-like object exposing `planType` and/or `code`.
 * Returns false (→ paid) when the plan is null/unresolved (fail-closed).
 *
 * @param {Object|null} planLike - e.g. event.planId (populated) or subscription.planId
 * @returns {boolean}
 */
function isTrialFromPlan(planLike) {
  if (!planLike || typeof planLike !== 'object') return false;
  return isTrialPlan(planLike.planType) || isTrialPlan(planLike.code);
}

/**
 * The event's real UTC instant from its `eventDetails` (date + time).
 * @param {Object} event - Event document (or plain object) with eventDetails
 * @param {Date} [date] - override date (UTC-midnight Date)
 * @param {string} [time] - override "HH:mm"
 * @returns {Date|null}
 */
function eventInstantOf(event, date, time) {
  const d = date ?? event?.eventDetails?.date;
  const t = time ?? event?.eventDetails?.time;
  if (!d || !t) return null;
  return parseDateTime(d, t);
}

/**
 * Event-date floor: a valid send window must exist.
 *   eventInstant ≥ now + minLead(plan) + 3 days
 * Throws EVENT_DATE_TOO_SOON (400) when violated.
 *
 * No-ops (returns) when the event instant can't be computed (missing
 * date/time) — schema-level `required` validators own that case.
 *
 * @param {Object} params
 * @param {Date} params.eventInstant - the event's real UTC instant
 * @param {boolean} params.isTrial
 * @param {Date} [params.now]
 * @throws {AppError} 400 EVENT_DATE_TOO_SOON
 */
function assertEventDateFloor({ eventInstant, isTrial, now = new Date() }) {
  if (!eventInstant) return;
  const earliestEventInstant = now.getTime() + minLeadMs(isTrial) + maxLeadMs();
  if (eventInstant.getTime() < earliestEventInstant) {
    const err = new AppError(
      'The event date is too soon to schedule invitations. Choose a later event date.',
      400,
      EVENT_DATE_TOO_SOON
    );
    err.details = {
      eventInstant: eventInstant.toISOString(),
      earliestEventInstant: new Date(earliestEventInstant).toISOString(),
      isTrial,
    };
    throw err;
  }
}

/**
 * Validate a scheduled-send instant against the window
 *   [ now + minLead(plan), eventInstant − 3 days ].
 * Throws SCHEDULE_TOO_SOON / SCHEDULE_TOO_LATE on violation.
 *
 * @param {Object} params
 * @param {Date} params.scheduledInstant - the send instant (UTC)
 * @param {Date|null} params.eventInstant - the event instant (UTC); upper bound skipped if null
 * @param {boolean} params.isTrial
 * @param {Date} [params.now]
 * @throws {AppError} 400 SCHEDULE_TOO_SOON | SCHEDULE_TOO_LATE
 */
function assertSendWindow({ scheduledInstant, eventInstant, isTrial, now = new Date() }) {
  const lead = minLeadMs(isTrial);
  const earliestSend = now.getTime() + lead;
  if (scheduledInstant.getTime() < earliestSend) {
    const minLeadHours = isTrial
      ? Math.ceil((config?.events?.trialScheduleMinLeadMinutes ?? 15) / 60)
      : (config?.events?.scheduleMinLeadHours ?? 24);
    const minLeadMinutes = config?.events?.trialScheduleMinLeadMinutes ?? 15;
    const unit = isTrial ? 'minutes' : 'hours';
    const amount = isTrial ? minLeadMinutes : minLeadHours;
    throw new AppError(
      `Schedule must be at least ${amount} ${unit} from now.`,
      400,
      SCHEDULE_TOO_SOON
    );
  }
  if (eventInstant) {
    const latestSend = eventInstant.getTime() - maxLeadMs();
    if (scheduledInstant.getTime() > latestSend) {
      const err = new AppError(
        `Invitations must be scheduled at least ${SCHEDULE_MAX_LEAD_DAYS} days before the event.`,
        400,
        SCHEDULE_TOO_LATE
      );
      err.details = {
        scheduledInstant: scheduledInstant.toISOString(),
        latestSend: new Date(latestSend).toISOString(),
        eventInstant: eventInstant.toISOString(),
      };
      throw err;
    }
  }
}

/**
 * Does a stored launchSettings schedule still satisfy the window for a
 * (possibly new) event instant? Used to decide whether to CLEAR a stored
 * schedule after the event date moves. Pure boolean — no throw.
 *
 * @param {Object} params
 * @param {Date} params.scheduledInstant - stored send instant (UTC)
 * @param {Date|null} params.eventInstant - event instant (UTC)
 * @param {boolean} params.isTrial
 * @param {Date} [params.now]
 * @param {boolean} [params.requireMinLead=true] - when true the send must
 *   still be at least the full min-lead in the future (use for a BRAND NEW
 *   schedule). When false only require the send to still be in the future —
 *   use when RE-validating an already-accepted schedule after the event date
 *   moved: the original lead was satisfied when it was set, so the natural
 *   passage of time alone must not silently invalidate it.
 * @returns {boolean}
 */
function isSendInWindow({ scheduledInstant, eventInstant, isTrial, now = new Date(), requireMinLead = true }) {
  if (!scheduledInstant) return false;
  const earliestSend = requireMinLead
    ? now.getTime() + minLeadMs(isTrial)
    : now.getTime();
  if (scheduledInstant.getTime() < earliestSend) return false;
  if (eventInstant) {
    const latestSend = eventInstant.getTime() - maxLeadMs();
    if (scheduledInstant.getTime() > latestSend) return false;
  }
  return true;
}

/**
 * Parse a (date, time) pair into a UTC instant, throwing SCHEDULE_INVALID
 * if it can't be parsed. Thin wrapper so callers share one error code.
 *
 * @param {Date|string} date
 * @param {string} time - "HH:mm"
 * @returns {Date}
 * @throws {AppError} 400 SCHEDULE_INVALID
 */
function parseSendInstant(date, time) {
  const instant = parseDateTime(date, time);
  if (!instant) {
    throw new AppError(
      'Invalid scheduledDate or scheduledTime format',
      400,
      SCHEDULE_INVALID
    );
  }
  return instant;
}

/** The stored launch (scheduled-send) instant for an event, or null. */
function storedSendInstant(event) {
  return parseEventTime(event);
}

module.exports = {
  MS_PER_MINUTE,
  MS_PER_HOUR,
  MS_PER_DAY,
  TRIAL_REMINDER_OFFSET_MS,
  PAID_REMINDER_DEFAULT_OFFSET_MS,
  PAID_REMINDER_MIN_GAP_MS,
  minLeadMs,
  maxLeadMs,
  isTrialFromPlan,
  eventInstantOf,
  assertEventDateFloor,
  assertSendWindow,
  isSendInWindow,
  parseSendInstant,
  storedSendInstant,
};
