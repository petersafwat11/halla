/**
 * Parse "H:MM:AM" / "H:MM:PM" stored string back to a Date for the mobile TimePicker.
 *
 * Edge cases:
 *   "12:00:AM" → midnight (00:00) — 12 AM is 0 in 24h
 *   "12:00:PM" → noon   (12:00) — 12 PM stays 12 in 24h
 */
function parseTimeString(str) {
  const [h, m, period] = str.split(":");
  let hour = parseInt(h, 10);
  const min = parseInt(m, 10);
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  const d = new Date();
  d.setHours(hour, min, 0, 0);
  return d;
}

/**
 * Convert a Date from the mobile TimePicker to canonical "H:MM:AM" string.
 *
 * Edge cases:
 *   d.getHours() === 0  → "12:XX:AM" (midnight maps to 12 AM)
 *   d.getHours() === 12 → "12:XX:PM" (noon maps to 12 PM)
 */
function dateToTimeString(d) {
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const period = h >= 12 ? "PM" : "AM";
  const h12 = ((h % 12) || 12).toString();
  return `${h12}:${m}:${period}`;
}

module.exports = { parseTimeString, dateToTimeString };
