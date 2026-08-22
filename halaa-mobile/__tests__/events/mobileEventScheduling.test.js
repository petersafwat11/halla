const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { ENDPOINTS } = require('../../config/api');

describe('Session 1.6 Mobile: Scheduling API and Helpers (EVT-09)', () => {
  it('registers messaging schedule endpoint in mobile config', () => {
    assert.equal(typeof ENDPOINTS.MESSAGING.SCHEDULE, 'string');
    assert.equal(ENDPOINTS.MESSAGING.SCHEDULE, '/messaging/schedule');
  });

  it('validates 12h to 24h conversion logic matching picker specifications', () => {
    const to24h = (ampmTime) => {
      if (!ampmTime || typeof ampmTime !== 'string') return null;
      const m = ampmTime.match(/^(\d{1,2}):(\d{2}):(AM|PM)$/i);
      if (!m) return null;
      let h = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10);
      if (h < 1 || h > 12 || mm < 0 || mm > 59) return null;
      const ampm = m[3].toUpperCase();
      if (ampm === 'AM' && h === 12) h = 0;
      else if (ampm === 'PM' && h !== 12) h += 12;
      return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    };

    assert.equal(to24h('12:00:AM'), '00:00');
    assert.equal(to24h('09:30:AM'), '09:30');
    assert.equal(to24h('12:00:PM'), '12:00');
    assert.equal(to24h('08:45:PM'), '20:45');
    assert.equal(to24h('invalid'), null);
  });
});
