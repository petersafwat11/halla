/**
 * Account Type Constants
 *
 * A `role:'host'` user is further discriminated by `accountType`:
 *   - 'personal' — an ordinary individual host (the historical default).
 *   - 'business' — a "هلا أعمال / Halaa Business" organization account. Inherits
 *     host authorization; adds branding, admin-assigned plans, setup fee, and
 *     portal-link invitation delivery. NEVER reintroduces whitelabel tenancy.
 *
 * Fail-closed rule: a `role:'host'` document MUST carry an explicit
 * 'personal' or 'business' accountType. `null`/undefined is a data bug and is
 * NEVER treated as personal by the scope helpers (see accountScope.js).
 *
 * @module shared/constants/accounts
 */

const ACCOUNT_TYPES = {
  PERSONAL: 'personal',
  BUSINESS: 'business',
};

const ACCOUNT_TYPE_VALUES = Object.values(ACCOUNT_TYPES);

const isBusinessAccount = (accountType) => accountType === ACCOUNT_TYPES.BUSINESS;
const isPersonalAccount = (accountType) => accountType === ACCOUNT_TYPES.PERSONAL;

module.exports = {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_VALUES,
  isBusinessAccount,
  isPersonalAccount,
};
