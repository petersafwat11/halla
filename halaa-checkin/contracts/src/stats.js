/**
 * @halaa-checkin/contracts
 * Pure statistics calculation for Halaa Guest Check-in.
 * Authoritative single source of truth matching Section 6 of 02-TECHNICAL-CONTRACT.md.
 */

/**
 * Round a number to one decimal place.
 *
 * @param {number} value
 * @returns {number}
 */
export function roundToOneDecimal(value) {
  if (!Number.isFinite(value) || value === 0) return 0;
  return Math.round(value * 10) / 10;
}

/**
 * Format a rate as a localized percentage string with exactly one decimal.
 *
 * @param {number} rate Percentage value (0..100)
 * @returns {string} e.g. "66.7%"
 */
export function formatRate(rate) {
  const rounded = roundToOneDecimal(rate);
  return `${rounded.toFixed(1)}%`;
}

/**
 * Calculate pure event attendance statistics from an array of guest documents or projections.
 *
 * Pure function:
 * - Only counts active (non-deleted) guests (deletedAt == null).
 * - Zero denominator yields 0 for attendance rates.
 * - Rates are rounded to one decimal place.
 * - Distinguishes invitation attendance from people/capacity attendance.
 *
 * @param {Array<object>} guests Array of guest records (active and/or soft-deleted)
 * @param {object} [options]
 * @param {string|Date} [options.asOf] Optional snapshot timestamp ISO string or Date
 * @returns {{
 *   totalInvitations: number,
 *   totalAllowedCompanions: number,
 *   expectedPeople: number,
 *   admittedInvitations: number,
 *   actualCompanions: number,
 *   actualAttendees: number,
 *   pendingInvitations: number,
 *   invitationAttendanceRate: number,
 *   capacityAttendanceRate: number,
 *   asOf: string
 * }}
 */
export function calculateStats(guests, { asOf } = {}) {
  const resolvedAsOf = asOf
    ? (asOf instanceof Date ? asOf.toISOString() : String(asOf))
    : new Date().toISOString();

  if (!Array.isArray(guests) || guests.length === 0) {
    return {
      totalInvitations: 0,
      totalAllowedCompanions: 0,
      expectedPeople: 0,
      admittedInvitations: 0,
      actualCompanions: 0,
      actualAttendees: 0,
      pendingInvitations: 0,
      invitationAttendanceRate: 0,
      capacityAttendanceRate: 0,
      asOf: resolvedAsOf,
    };
  }

  let totalInvitations = 0;
  let totalAllowedCompanions = 0;
  let admittedInvitations = 0;
  let actualCompanions = 0;

  for (const guest of guests) {
    // Exclude soft-deleted guests
    if (guest.deletedAt !== null && guest.deletedAt !== undefined) {
      continue;
    }

    totalInvitations += 1;
    totalAllowedCompanions += Math.max(0, Number(guest.allowedCompanions) || 0);

    if (guest.checkIn !== null && guest.checkIn !== undefined) {
      admittedInvitations += 1;
      actualCompanions += Math.max(0, Number(guest.checkIn.actualCompanions) || 0);
    }
  }

  const expectedPeople = totalInvitations + totalAllowedCompanions;
  const actualAttendees = admittedInvitations + actualCompanions;
  const pendingInvitations = totalInvitations - admittedInvitations;

  const invitationAttendanceRate = totalInvitations > 0
    ? roundToOneDecimal((admittedInvitations / totalInvitations) * 100)
    : 0;

  const capacityAttendanceRate = expectedPeople > 0
    ? roundToOneDecimal((actualAttendees / expectedPeople) * 100)
    : 0;

  return {
    totalInvitations,
    totalAllowedCompanions,
    expectedPeople,
    admittedInvitations,
    actualCompanions,
    actualAttendees,
    pendingInvitations,
    invitationAttendanceRate,
    capacityAttendanceRate,
    asOf: resolvedAsOf,
  };
}
