/**
 * Timezone utility.
 *
 * Phase 1b foundation (PIPELINE-F05). Convention:
 *
 *   - All timestamps are stored as UTC `Date` instances in MongoDB.
 *   - Backend never depends on `process.env.TZ` or `Date#getHours()` for
 *     business logic.
 *   - Saudi Arabia (Asia/Riyadh) is the default user timezone. KSA does
 *     not observe DST and is fixed at UTC+3, so we can compute Riyadh
 *     instants with a constant offset without pulling in `date-fns-tz` or
 *     `moment-timezone`. If we expand beyond KSA we swap this module's
 *     internals for a real TZ library; consumers do not change.
 *
 * The frontend formatter (`formatInUserTimezone`) lives next to the
 * frontend code per the master plan; this module is backend-only.
 */

const DEFAULT_TZ = "Asia/Riyadh";
const RIYADH_OFFSET_MINUTES = 3 * 60; // UTC+3 (KSA, no DST)

/**
 * Current time as a UTC ISO string.
 * @returns {string}
 */
const nowUtc = () => new Date().toISOString();

/**
 * Convert a Date that the caller built in Asia/Riyadh wall-clock
 * (e.g. `new Date("2024-01-01T18:30")` interpreted as Riyadh) to a real
 * UTC Date.
 *
 * Used by `parseEventTime` below.
 *
 * @param {Date} riyadhWallClock - a Date whose epoch milliseconds were
 *                                 constructed assuming UTC+3
 * @returns {Date}
 */
const fromRiyadhWallClock = (riyadhWallClock) => {
  return new Date(riyadhWallClock.getTime() - RIYADH_OFFSET_MINUTES * 60 * 1000);
};

/**
 * Resolve an event's scheduled launch time to a UTC Date.
 *
 * Given:
 *   eventDoc.launchSettings.scheduledDate -> Date (UTC midnight on the day)
 *   eventDoc.launchSettings.scheduledTime -> "HH:mm" wall-clock in Asia/Riyadh
 *
 * Returns the absolute UTC instant when the launch is supposed to fire.
 *
 * @param {Object} eventDoc
 * @param {string} [tz] — currently advisory; only Asia/Riyadh is implemented.
 * @returns {Date|null}
 */
const parseEventTime = (eventDoc, tz = DEFAULT_TZ) => {
  const scheduledDate = eventDoc?.launchSettings?.scheduledDate;
  const scheduledTime = eventDoc?.launchSettings?.scheduledTime; // "HH:mm"

  if (!scheduledDate || !scheduledTime) return null;

  const m = /^(\d{1,2}):(\d{2})$/.exec(scheduledTime.trim());
  if (!m) return null;

  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (Number.isNaN(hh) || Number.isNaN(mm) || hh > 23 || mm > 59) return null;

  // Pull the Y/M/D from the scheduledDate's UTC components — this is the
  // calendar date the host picked, regardless of what timezone the server
  // is running in.
  const d = new Date(scheduledDate);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth(); // 0-indexed
  const day = d.getUTCDate();

  if (tz === "Asia/Riyadh" || tz === DEFAULT_TZ) {
    // Build the instant as if Y-M-D HH:mm were UTC, then subtract the
    // Riyadh offset to get the actual UTC instant.
    const naiveUtc = Date.UTC(year, month, day, hh, mm, 0, 0);
    return new Date(naiveUtc - RIYADH_OFFSET_MINUTES * 60 * 1000);
  }

  // Fallback: treat as UTC. Future enhancement plugs in date-fns-tz here.
  return new Date(Date.UTC(year, month, day, hh, mm, 0, 0));
};

/**
 * "Should this event fire in this cron tick?"
 *
 * Returns true when the cron tick is at or just past the scheduled UTC
 * instant, within `windowSeconds` (default 60s, matching the once-per-minute
 * cron). The window protects against drift if a tick fires a few seconds
 * late.
 *
 * @param {Object} eventDoc
 * @param {Date} [now=new Date()]
 * @param {number} [windowSeconds=60]
 * @returns {boolean}
 */
const isDue = (eventDoc, now = new Date(), windowSeconds = 60) => {
  const scheduled = parseEventTime(eventDoc);
  if (!scheduled) return false;
  const diffSec = (now.getTime() - scheduled.getTime()) / 1000;
  return diffSec >= 0 && diffSec < windowSeconds;
};

module.exports = {
  DEFAULT_TZ,
  RIYADH_OFFSET_MINUTES,
  nowUtc,
  fromRiyadhWallClock,
  parseEventTime,
  isDue,
};
