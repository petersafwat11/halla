const { parseDateTime } = require('../../shared/utils/timezone');

function escapeIcs(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
}
function fold(line) {
  let result = '', bytes = 0;
  for (const char of line) {
    const size = Buffer.byteLength(char);
    if (bytes + size > 74) { result += '\r\n '; bytes = 1; }
    result += char; bytes += size;
  }
  return result;
}
const stamp = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
function guestEventActions(event) {
  const details = event.eventDetails || {};
  const location = details.location || {};
  const actions = {};
  const { latitude, longitude } = location;
  if (typeof latitude === 'number' && typeof longitude === 'number' && Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) {
    actions.directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    const params = new URLSearchParams({ action: 'setPickup', pickup: 'my_location', 'dropoff[latitude]': latitude, 'dropoff[longitude]': longitude, 'dropoff[nickname]': location.address || details.title || '' });
    actions.ride = { provider: 'Uber', url: `https://m.uber.com/ul/?${params}`, fallbackUrl: actions.directionsUrl };
  }
  const normalized = String(details.time || '').replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 0x660));
  const match = /^(\d{1,2}):(\d{2})(?:\s*:?\s*(AM|PM|ص|م))?$/i.exec(normalized.trim());
  let time = normalized;
  if (match?.[3] && Number(match[1]) >= 1 && Number(match[1]) <= 12) {
    const hour = Number(match[1]) % 12 + (/^(PM|م)$/i.test(match[3]) ? 12 : 0);
    time = `${String(hour).padStart(2, '0')}:${match[2]}`;
  }
  const start = parseDateTime(details.date, time);
  if (start && !Number.isNaN(start.getTime())) {
    const when = stamp(start);
    // Start-only ICS; Google gets a calendar-only one-hour editing default.
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Halaa//Business invitation//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      `UID:${event._id}@halaa.sa`, `DTSTAMP:${when}`, `DTSTART:${when}`, `SUMMARY:${escapeIcs(details.title)}`,
      `LOCATION:${escapeIcs(location.address)}`, 'END:VEVENT', 'END:VCALENDAR'];
    actions.calendarIcs = lines.map(fold).join('\r\n') + '\r\n';
    actions.googleCalendarUrl = 'https://calendar.google.com/calendar/render?' + new URLSearchParams({ action: 'TEMPLATE', text: details.title || '', dates: `${when}/${stamp(new Date(start.getTime() + 3600000))}`, ctz: 'Asia/Riyadh', location: location.address || '' });
    actions.startAt = start.toISOString();
  }
  return actions;
}
module.exports = { guestEventActions, escapeIcs, fold };
