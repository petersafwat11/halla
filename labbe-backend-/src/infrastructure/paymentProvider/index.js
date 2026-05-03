/**
 * Payment provider factory.
 *
 * Phase 1b foundation. Choose Moyasar or the stub provider based on
 * `MOYASAR_API_KEY`. The chosen provider is logged once at module load so
 * it is obvious in boot logs which mode is active. Consumers import
 * `paymentProvider` and call `.charge(...)`; they don't care which
 * implementation backs it.
 *
 * Cross-utility wiring: `charge()` accepts an `idempotencyKey` and uses
 * the idempotency utility (`shared/utils/idempotency`) to guarantee
 * exactly-once external calls when the caller supplies a key. This pairs
 * with the Phase 1b idempotency utility — the same key that guards the
 * HTTP route also guards the outbound charge.
 *
 * AMOUNT UNIT (B-2): see `moyasar.js`. `amount` is a SAR major-unit
 * number (e.g. 29 = 29.00 SAR, 99.99 = 99.99 SAR). The provider
 * converts to halalas internally — callers MUST pass SAR.
 *
 * REQUEST HASH (post-M-1 fix):
 * The idempotency layer requires a `requestHash` so that a key reused
 * with a different body is detected as a conflict. We compute it here
 * over the canonical, side-effect-relevant fields — explicitly EXCLUDING
 * `idempotencyKey` itself (it is not part of the logical payload) and
 * `customer` PII (which can carry session-volatile fields).
 */

const stub = require("./stub");
const moyasar = require("./moyasar");
const { withIdempotency, sha256 } = require("../../shared/utils/idempotency");

const isMoyasarConfigured = () => !!process.env.MOYASAR_API_KEY;

const active = isMoyasarConfigured() ? moyasar : stub;

console.log(
  `[paymentProvider] active provider: ${active.name}` +
    (active.name === "stub" ? " (MOYASAR_API_KEY absent — synthetic success)" : "")
);

const computeChargeRequestHash = (params) => {
  const { amount, currency, paymentMethod, metadata } = params || {};
  return sha256({
    amount: amount ?? null,
    currency: currency ?? null,
    paymentMethod: paymentMethod ?? null,
    metadata: metadata ?? null,
  });
};

/**
 * Charge a customer.
 *
 * @param {Object} params
 * @param {number} params.amount         REQUIRED. SAR major units —
 *                                        e.g. 29 (= 29.00 SAR) or 99.99.
 * @param {string} [params.currency]     ISO-4217. Default "SAR".
 * @param {Object} [params.customer]
 * @param {Object} [params.metadata]
 * @param {string} [params.idempotencyKey]
 * @param {string} [params.paymentMethod]
 * @param {string|import('mongoose').Types.ObjectId|null} [params.userId]
 *   Used to scope the idempotency record per-user. Defaults to null.
 * @returns {Promise<Object>}
 */
const charge = async (params) => {
  const { idempotencyKey, userId = null } = params || {};
  if (!idempotencyKey) {
    return active.charge(params);
  }
  return withIdempotency(
    `payment:${idempotencyKey}`,
    () => active.charge(params),
    {
      scope: "payment.charge",
      requestHash: computeChargeRequestHash(params),
      userId,
    }
  );
};

module.exports = {
  active,
  charge,
  refund: (...args) => active.refund(...args),
  isMoyasarConfigured,
};
