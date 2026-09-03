/**
 * Hardened parser for unread notification count (F-17).
 * Ensures badge count strictly evaluates to a positive integer or 0.
 *
 * @param {*} count - Raw count value from API / props
 * @returns {number} Non-negative integer count
 */
export const parseUnreadCount = (count) => {
  const parsed = Number(count);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
};
