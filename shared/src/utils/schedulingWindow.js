const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export const TRIAL_SCHEDULE_MIN_LEAD_MS = 15 * MS_PER_MINUTE;
export const PAID_SCHEDULE_MIN_LEAD_MS = 24 * MS_PER_HOUR;
export const INVITATION_EVENT_CUTOFF_MS = 3 * MS_PER_DAY;

const RIYADH_OFFSET_MS = 3 * MS_PER_HOUR;

export function scheduleMinLeadMs(isTrial) {
  return isTrial
    ? TRIAL_SCHEDULE_MIN_LEAD_MS
    : PAID_SCHEDULE_MIN_LEAD_MS;
}

export function parseClockParts(value) {
  const match = String(value ?? "")
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*:?\s*(AM|PM)?$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3]?.toUpperCase();
  if (minute < 0 || minute > 59) return null;

  if (period) {
    if (hour < 1 || hour > 12) return null;
    if (hour === 12) hour = 0;
    if (period === "PM") hour += 12;
  } else if (hour < 0 || hour > 23) {
    return null;
  }

  return { hour, minute };
}

export function calendarParts(value) {
  if (!value) return null;

  if (typeof value === "string") {
    const isoDay = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoDay) {
      return {
        year: Number(isoDay[1]),
        month: Number(isoDay[2]) - 1,
        day: Number(isoDay[3]),
      };
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  // API event/schedule dates are UTC-midnight calendar tokens. Date pickers,
  // on the other hand, produce local-midnight Date objects. Preserve both.
  if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0) {
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth(),
      day: date.getUTCDate(),
    };
  }
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
  };
}

/** Interpret the selected calendar day/time as an Asia/Riyadh wall clock. */
export function riyadhWallClockInstant(dateValue, timeValue) {
  const date = calendarParts(dateValue);
  const time = parseClockParts(timeValue);
  if (!date || !time) return null;

  return new Date(
    Date.UTC(
      date.year,
      date.month,
      date.day,
      time.hour,
      time.minute,
      0,
      0
    ) - RIYADH_OFFSET_MS
  );
}

/** Convert an absolute instant to a local-midnight Date suitable for pickers. */
export function instantToPickerDay(value) {
  const instant = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(instant.getTime())) return null;
  const riyadh = new Date(instant.getTime() + RIYADH_OFFSET_MS);
  return new Date(
    riyadh.getUTCFullYear(),
    riyadh.getUTCMonth(),
    riyadh.getUTCDate(),
    0,
    0,
    0,
    0
  );
}

export function getScheduleWindow({
  isTrial,
  eventDate,
  eventTime,
  now = new Date(),
} = {}) {
  const nowInstant = now instanceof Date ? now : new Date(now);
  const earliestInstant = new Date(
    nowInstant.getTime() + scheduleMinLeadMs(Boolean(isTrial))
  );
  const eventInstant = riyadhWallClockInstant(eventDate, eventTime);
  const latestInstant = eventInstant
    ? new Date(eventInstant.getTime() - INVITATION_EVENT_CUTOFF_MS)
    : null;

  return {
    earliestInstant,
    latestInstant,
    minimumDate: instantToPickerDay(earliestInstant),
    maximumDate: latestInstant ? instantToPickerDay(latestInstant) : undefined,
    hasValidWindow:
      !latestInstant || earliestInstant.getTime() <= latestInstant.getTime(),
  };
}

export function validateScheduleSelection({
  date,
  time,
  isTrial,
  eventDate,
  eventTime,
  now = new Date(),
} = {}) {
  const selectedInstant = riyadhWallClockInstant(date, time);
  if (!selectedInstant) return { valid: false, reason: "invalid", selectedInstant: null };

  const window = getScheduleWindow({ isTrial, eventDate, eventTime, now });
  if (selectedInstant.getTime() < window.earliestInstant.getTime()) {
    return { valid: false, reason: "tooSoon", selectedInstant, ...window };
  }
  if (
    window.latestInstant &&
    selectedInstant.getTime() > window.latestInstant.getTime()
  ) {
    return { valid: false, reason: "tooLate", selectedInstant, ...window };
  }
  return { valid: true, reason: null, selectedInstant, ...window };
}
