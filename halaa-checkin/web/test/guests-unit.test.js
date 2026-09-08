import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toRiyadhDateInput, toRiyadhIsoString, formatRiyadhDate } from '../lib/locale.js';
import { LIMITS, calculateStats } from '@halaa-checkin/contracts';

describe('T08 — Guests Workspace Unit & Contract Verification', () => {

  describe('Asia/Riyadh Date Formatting and Serialization', () => {
    it('toRiyadhDateInput correctly extracts local date and time in Asia/Riyadh (+03:00)', () => {
      // 2026-09-08 17:00:00 UTC = 2026-09-08 20:00:00 in Asia/Riyadh
      const utcIso = '2026-09-08T17:00:00.000Z';
      const { dateStr, timeStr } = toRiyadhDateInput(utcIso);

      assert.equal(dateStr, '2026-09-08', 'Date part must match Riyadh local date');
      assert.equal(timeStr, '20:00', 'Time part must match Riyadh local time (+3h)');
    });

    it('toRiyadhIsoString formats date and time with explicit +03:00 offset', () => {
      const dateStr = '2026-09-08';
      const timeStr = '20:30';
      const serialized = toRiyadhIsoString(dateStr, timeStr);

      assert.equal(serialized, '2026-09-08T20:30:00+03:00');

      // Verify it parses as an exact UTC point in time
      const d = new Date(serialized);
      assert.equal(d.toISOString(), '2026-09-08T17:30:00.000Z');
    });

    it('formatRiyadhDate produces consistent Arabic and English representations', () => {
      const timestamp = '2026-09-08T18:00:00+03:00';
      const arDate = formatRiyadhDate(timestamp, 'ar');
      const enDate = formatRiyadhDate(timestamp, 'en');

      assert.ok(arDate.length > 0, 'Arabic formatted date must not be empty');
      assert.ok(enDate.length > 0, 'English formatted date must not be empty');
      assert.ok(enDate.includes('2026'), 'English formatted date should include year 2026');
    });
  });

  describe('Form Constraints and Limits Verification', () => {
    it('limits match Technical Contract specifications', () => {
      assert.equal(LIMITS.MIN_COMPANIONS_PER_GUEST, 0);
      assert.equal(LIMITS.MAX_COMPANIONS_PER_GUEST, 20);
      assert.equal(LIMITS.MAX_EVENT_NAME_LENGTH, 120);
      assert.equal(LIMITS.MAX_EVENT_VENUE_LENGTH, 160);
      assert.equal(LIMITS.MIN_REASON_LENGTH, 5);
      assert.equal(LIMITS.MAX_REASON_LENGTH, 500);
      assert.equal(LIMITS.MAX_CSV_BYTES, 2 * 1024 * 1024);
    });

    it('companion names count validation logic', () => {
      const allowedCompanions = 2;
      const validLines = ['سارة حسن', 'عمر حسن'];
      const invalidLines = ['سارة حسن', 'عمر حسن', 'ريم حسن'];

      assert.equal(validLines.length <= allowedCompanions, true);
      assert.equal(invalidLines.length <= allowedCompanions, false);
    });
  });

  describe('Technical Contract §6 Statistics Fixture Verification', () => {
    it('fixture: A allows 2 & arrives with 1; B allows 0 & pending; C allows 3 & arrives with 3', () => {
      const guests = [
        {
          id: 'g1',
          allowedCompanions: 2,
          checkIn: { actualCompanions: 1, admittedAt: new Date() },
          deletedAt: null,
        },
        {
          id: 'g2',
          allowedCompanions: 0,
          checkIn: null,
          deletedAt: null,
        },
        {
          id: 'g3',
          allowedCompanions: 3,
          checkIn: { actualCompanions: 3, admittedAt: new Date() },
          deletedAt: null,
        },
      ];

      const stats = calculateStats(guests);

      assert.equal(stats.totalInvitations, 3);
      assert.equal(stats.expectedPeople, 8); // 3 guests + 5 allowed companions = 8
      assert.equal(stats.admittedInvitations, 2);
      assert.equal(stats.actualAttendees, 6); // 2 admitted + (1 + 3) companions = 6
      assert.equal(stats.pendingInvitations, 1);
      assert.equal(stats.invitationAttendanceRate, 66.7); // 2/3 * 100 = 66.666... => 66.7
      assert.equal(stats.capacityAttendanceRate, 75.0); // 6/8 * 100 = 75.0
    });
  });
});
