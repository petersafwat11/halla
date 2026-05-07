/**
 * Admin Controller — shared helpers
 */

/**
 * Extract whitelabel ID from middleware's req.whitelabelFilter.
 * The filterByWhitelabel middleware sets:
 *   - req.whitelabelFilter = {} for super_admin (sees everything)
 *   - req.whitelabelFilter = { whitelabelId: X } for whitelabel roles
 *   - req.whitelabelFilter = { whitelabelId: null } for platform admin/moderator
 *
 * The service layer expects:
 *   - undefined → no filter (super admin sees all)
 *   - whitelabelId value → filter to that whitelabel
 *   - null → filter to main platform only
 */
const getWhitelabelIdFromFilter = (req) => {
  const filter = req.whitelabelFilter;
  if (!filter || Object.keys(filter).length === 0) {
    return undefined; // super admin — no filter
  }
  return filter.whitelabelId; // could be an ObjectId or null
};

module.exports = { getWhitelabelIdFromFilter };
