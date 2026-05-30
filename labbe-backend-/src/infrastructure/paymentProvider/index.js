/**
 * Payment provider factory.
 *
 * Always Moyasar. Wraps `charge()` with `withIdempotency()` so the
 * outbound call is exactly-once when the caller supplies an
 * `idempotencyKey`. The same key is also passed down to the provider,
 * which converts it to a Moyasar `given_id` — defense in depth: if
 * the network retries past our cache, Moyasar still dedupes.
 *
 * `fetchPayment`, `refund`, `capture`, `voidPayment` are passed through
 * directly. Refunds are NOT idempotency-wrapped at this layer because
 * partial refunds must be permitted in sequence (one /refund call per
 * partial event). The admin endpoints have their own idempotency
 * middleware to guard double-clicks.
 */

const moyasar = require("./moyasar");
const { withIdempotency, sha256 } = require("../../shared/utils/idempotency");

if (!process.env.MOYASAR_API_KEY) {
  throw new Error(
    "[paymentProvider] MOYASAR_API_KEY is required — set it in config.env before starting the server."
  );
}

const active = moyasar;

console.log(`[paymentProvider] active provider: ${active.name}`);

const computeChargeRequestHash = (params) => {
  const { amount, currency, source, metadata } = params || {};
  return sha256({
    amount: amount ?? null,
    currency: currency ?? null,
    sourceType: source?.type ?? null,
    metadata: metadata ?? null,
  });
};

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
  fetchPayment: (id) => active.fetchPayment(id),
  refund: (params) => active.refund(params),
  capture: (params) => active.capture(params),
  voidPayment: (params) => active.voidPayment(params),
  createInvoice: (params) => active.createInvoice(params),
  fetchInvoice: (id) => active.fetchInvoice(id),
};
