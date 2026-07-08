/**
 * Product eligibility gate (billing-plan §1.2). PURE.
 *
 * Every server-side grant must confirm the resolved account may receive the
 * exact catalog product, using the catalog's own `eligibleRoles` /
 * `eligibleAccountTypes` (derived from the signed audience mapping). This blocks
 * a vendor/guest/moderator/admin from receiving a host product, and a personal
 * host from receiving a business product (and vice-versa). Ineligible grants
 * fail closed (dead-letter), never silently grant.
 */

/**
 * @param {{role?:string, accountType?:string}} user
 * @param {object|null} catalogItem
 * @returns {{ ok:boolean, reason:string|null }}
 */
function checkEligible(user, catalogItem) {
  if (!catalogItem) return { ok: false, reason: "no_catalog_item" };
  const role = user?.role || null;
  // host accounts must declare personal|business; default null → personal.
  const accountType = user?.accountType || "personal";

  const roles = catalogItem.eligibleRoles || [];
  const accountTypes = catalogItem.eligibleAccountTypes || [];

  if (!roles.includes(role)) {
    return { ok: false, reason: "role_not_eligible" };
  }
  if (!accountTypes.includes(accountType)) {
    return { ok: false, reason: "account_type_not_eligible" };
  }
  return { ok: true, reason: null };
}

module.exports = { checkEligible };
