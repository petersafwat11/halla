/**
 * Fail-closed account-type assertion.
 *
 * Business-account principle #13: a `role:'host'` document MUST carry an
 * explicit `accountType` ('personal' | 'business'). A `null`/missing value is a
 * data bug — the scope helpers never treat it as personal, so such a host would
 * silently vanish from every admin list. This non-blocking startup check
 * surfaces the count so monitoring can alert, and is also exercised by tests.
 *
 * @module shared/utils/accountTypeAssertion
 */

const { ROLES } = require('../constants/roles');
const logger = require('./logger');

/**
 * Count hosts with a missing/null accountType.
 * @param {import('mongoose').Model} [UserModel]
 * @returns {Promise<number>}
 */
async function countHostsWithNullAccountType(UserModel) {
  const User = UserModel || require('../../../models/UserModel');
  return User.countDocuments({
    role: ROLES.HOST,
    $or: [{ accountType: null }, { accountType: { $exists: false } }],
  });
}

/**
 * Non-blocking startup assertion. Logs an error (monitoring alert hook) if any
 * `{ role:'host', accountType:null }` documents exist. Never throws — a data
 * issue must not crash the server, only be loudly visible.
 */
async function assertNoNullAccountTypeHosts() {
  try {
    const count = await countHostsWithNullAccountType();
    if (count > 0) {
      logger.error(
        '[account-type] FAIL-CLOSED VIOLATION: ' +
          `${count} host(s) have accountType=null. These are invisible to ` +
          'personal/business scoped queries. Run ' +
          'scripts/migrate-host-account-type-backfill.js --apply.',
        { nullAccountTypeHosts: count }
      );
    } else {
      logger.info('[account-type] startup check OK — no null-accountType hosts.');
    }
    return count;
  } catch (err) {
    logger.warn('[account-type] startup check failed to run', {
      error: err?.message,
    });
    return -1;
  }
}

module.exports = { countHostsWithNullAccountType, assertNoNullAccountTypeHosts };
