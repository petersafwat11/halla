/**
 * Payment provider factory.
 *
 * Chooses Moyasar or stub based on `MOYASAR_API_KEY`. Wraps `charge()`
 * with `withIdempotency()` so the outbound call is exactly-once when
 * the caller supplies an `idempotencyKey`. The same key is also passed
 * down to the provider, which converts it to a Moyasar `given_id` —
 * defense in depth: if the network retries past our cache, Moyasar
 * still dedupes.
 *
 * `fetchPayment`, `refund`, `capture`, `voidPayment` are passed through
 * directly. Refunds are NOT idempotency-wrapped at this layer because
 * partial refunds must be permitted in sequence (one /refund call per
 * partial event). The admin endpoints have their own idempotency
 * middleware to guard double-clicks.
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
  createInvoice: (params) =>
    typeof active.createInvoice === "function"
      ? active.createInvoice(params)
      : Promise.resolve({ success: false, error: "createInvoice not supported", provider: active.name }),
  fetchInvoice: (id) =>
    typeof active.fetchInvoice === "function"
      ? active.fetchInvoice(id)
      : Promise.resolve({ success: false, error: "fetchInvoice not supported", provider: active.name }),
  isMoyasarConfigured,
};
