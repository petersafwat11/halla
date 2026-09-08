import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateStats, roundToOneDecimal, formatRate } from '../src/stats.js';

test('calculateStats: exact 3-invitation statistics fixture from contract Section 6', () => {
  // Fixture from Section 6:
  // A allows 2 and arrives with 1
  // B allows 0 and has not arrived
  // C allows 3 and arrives with 3
  const fixtureGuests = [
    {
      id: '507f1f77bcf86cd799439011',
      name: 'Guest A',
      allowedCompanions: 2,
      checkIn: {
        actualCompanions: 1,
        checkedInAt: '2026-09-08T18:00:00.000Z',
        checkedInBy: '507f1f77bcf86cd799439099',
        operatorName: 'Sara Staff',
        method: 'scanner',
      },
    },
    {
      id: '507f1f77bcf86cd799439012',
      name: 'Guest B',
      allowedCompanions: 0,
      checkIn: null,
    },
    {
      id: '507f1f77bcf86cd799439013',
      name: 'Guest C',
      allowedCompanions: 3,
      checkIn: {
        actualCompanions: 3,
        checkedInAt: '2026-09-08T18:30:00.000Z',
        checkedInBy: '507f1f77bcf86cd799439099',
        operatorName: 'Sara Staff',
        method: 'camera',
      },
    },
  ];

  const stats = calculateStats(fixtureGuests, { asOf: '2026-09-08T19:00:00.000Z' });

  // Expected from contract §6:
  // invitations: 3
  // allowed companions: 5
  // expected people: 8
  // admitted invitations: 2
  // actual companions: 4
  // actual attendees: 6
  // pending invitations: 1
  // invitation rate: 66.7%
  // capacity rate: 75.0%
  assert.equal(stats.totalInvitations, 3, 'Total invitations must be 3');
  assert.equal(stats.totalAllowedCompanions, 5, 'Total allowed companions must be 5');
  assert.equal(stats.expectedPeople, 8, 'Expected people must be 8');
  assert.equal(stats.admittedInvitations, 2, 'Admitted invitations must be 2');
  assert.equal(stats.actualCompanions, 4, 'Actual companions must be 4');
  assert.equal(stats.actualAttendees, 6, 'Actual attendees must be 6');
  assert.equal(stats.pendingInvitations, 1, 'Pending invitations must be 1');
  assert.equal(stats.invitationAttendanceRate, 66.7, 'Invitation attendance rate must be 66.7');
  assert.equal(stats.capacityAttendanceRate, 75.0, 'Capacity attendance rate must be 75.0');
  assert.equal(stats.asOf, '2026-09-08T19:00:00.000Z');

  // Verify formatted percentages
  assert.equal(formatRate(stats.invitationAttendanceRate), '66.7%');
  assert.equal(formatRate(stats.capacityAttendanceRate), '75.0%');
});

test('calculateStats: zero totals and empty input handled safely', () => {
  const emptyCases = [[], null, undefined];

  for (const emptyInput of emptyCases) {
    const stats = calculateStats(emptyInput);
    assert.equal(stats.totalInvitations, 0);
    assert.equal(stats.totalAllowedCompanions, 0);
    assert.equal(stats.expectedPeople, 0);
    assert.equal(stats.admittedInvitations, 0);
    assert.equal(stats.actualCompanions, 0);
    assert.equal(stats.actualAttendees, 0);
    assert.equal(stats.pendingInvitations, 0);
    assert.equal(stats.invitationAttendanceRate, 0);
    assert.equal(stats.capacityAttendanceRate, 0);
    assert.ok(typeof stats.asOf === 'string' && stats.asOf.length > 0);
  }
});

test('calculateStats: soft-deleted guests are excluded from calculations', () => {
  const guestsWithDeleted = [
    {
      id: '1',
      name: 'Active 1',
      allowedCompanions: 1,
      checkIn: { actualCompanions: 1 },
      deletedAt: null,
    },
    {
      id: '2',
      name: 'Deleted Guest',
      allowedCompanions: 5,
      checkIn: { actualCompanions: 5 },
      deletedAt: '2026-09-08T17:00:00.000Z',
    },
    {
      id: '3',
      name: 'Active 2',
      allowedCompanions: 2,
      checkIn: null,
      deletedAt: null,
    },
  ];

  const stats = calculateStats(guestsWithDeleted);

  assert.equal(stats.totalInvitations, 2);
  assert.equal(stats.totalAllowedCompanions, 3);
  assert.equal(stats.expectedPeople, 5);
  assert.equal(stats.admittedInvitations, 1);
  assert.equal(stats.actualCompanions, 1);
  assert.equal(stats.actualAttendees, 2);
  assert.equal(stats.pendingInvitations, 1);
  assert.equal(stats.invitationAttendanceRate, 50.0);
  assert.equal(stats.capacityAttendanceRate, 40.0);
});

test('roundToOneDecimal helper works correctly', () => {
  assert.equal(roundToOneDecimal(0), 0);
  assert.equal(roundToOneDecimal(66.6666), 66.7);
  assert.equal(roundToOneDecimal(75), 75);
  assert.equal(roundToOneDecimal(33.3333), 33.3);
  assert.equal(roundToOneDecimal(99.99), 100);
});
