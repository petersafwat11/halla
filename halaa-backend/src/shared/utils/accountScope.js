/**
 * Account-Scope Query Helpers
 *
 * Centralizes the host/account-type segregation filters used across the admin
 * and dashboard services so every customer-host query is explicit about which
 * population it targets. This is principle #1 of the business-account plan:
 * segregate by accountType with a SINGLE shared filter, never ad-hoc
 * `{ role: 'host' }` queries that silently mix personal + business.
 *
 * FAIL-CLOSED: `personalHostFilter()` requires `accountType:'personal'`
 * explicitly — a `role:'host'` doc with `accountType:null` is NOT returned by
 * the personal filter (it is a data bug, surfaced rather than masked). Likewise
 * the business filter requires `accountType:'business'`.
 *
 * @module shared/utils/accountScope
 */

const { ROLES } = require('../constants/roles');
const { ACCOUNT_TYPES } = require('../constants/accounts');

/**
 * Personal hosts only (the historical "Hosts" admin page population).
 * @param {Object} [extra] - additional query clauses merged in.
 */
function personalHostFilter(extra = {}) {
  return { role: ROLES.HOST, accountType: ACCOUNT_TYPES.PERSONAL, ...extra };
}

/**
 * Business hosts only (the new "Businesses" admin page population).
 * @param {Object} [extra] - additional query clauses merged in.
 */
function businessHostFilter(extra = {}) {
  return { role: ROLES.HOST, accountType: ACCOUNT_TYPES.BUSINESS, ...extra };
}

/**
 * All customer hosts — personal AND business — for reporting/targeting that
 * deliberately spans both. Use ONLY where mixing is intended; prefer the
 * segregated filters everywhere else.
 * @param {Object} [extra] - additional query clauses merged in.
 */
function allCustomerHostsFilter(extra = {}) {
  return { role: ROLES.HOST, ...extra };
}

module.exports = {
  personalHostFilter,
  businessHostFilter,
  allCustomerHostsFilter,
};
