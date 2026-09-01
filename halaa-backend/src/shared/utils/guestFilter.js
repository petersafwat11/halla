/**
 * Active Event Guest Filter Utility
 * Standardizes query filter for active (non-soft-deleted) guests belonging to an event's current guestList.
 * @module shared/utils/guestFilter
 */

/**
 * Returns a MongoDB query filter targeting only active guests for an event.
 * If subsetIds is provided, intersects subsetIds with guestList.
 *
 * This helper intentionally fails closed: a missing/empty current guest list or
 * an empty intersection produces `_id: { $in: [] }`. Omitting the `_id` clause
 * in either case would broaden the query to every historical guest for the
 * event, including guests no longer present in the event's authoritative list.
 * @param {string|ObjectId} eventId
 * @param {Array<string|ObjectId>} [guestList=[]] - Event's guestList or targeted guest IDs
 * @param {Array<string|ObjectId>} [subsetIds=null] - Optional specific guest subset to filter by
 * @returns {Object}
 */
function getActiveEventGuestsFilter(eventId, guestList = [], subsetIds = null) {
  const filter = {
    event: eventId,
    deleted: { $ne: true },
  };

  const currentGuestIds = Array.isArray(guestList)
    ? guestList.filter(Boolean)
    : [];
  const currentIdSet = new Set(currentGuestIds.map((id) => String(id)));

  const targetIds = Array.isArray(subsetIds)
    ? subsetIds.filter((id) => id && currentIdSet.has(String(id)))
    : currentGuestIds;

  // Always retain the membership boundary, even when it matches no records.
  filter._id = { $in: targetIds };
  return filter;
}

module.exports = {
  getActiveEventGuestsFilter,
};
