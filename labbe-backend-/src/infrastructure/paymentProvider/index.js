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
 */

const stub = require("./stub");
const moyasar = require("./moyasar");
const { withIdempotency } = require("../../shared/utils/idempotency");

const isMoyasarConfigured = () => !!process.env.MOYASAR_API_KEY;

const active = isMoyasarConfigured() ? moyasar : stub;

console.log(
  `[paymentProvider] active provider: ${active.name}` +
    (active.name === "stub" ? " (MOYASAR_API_KEY absent — synthetic success)" : "")
);

const charge = async (params) => {
  const { idempotencyKey } = params || {};
  if (!idempotencyKey) {
    return active.charge(params);
  }
  return withIdempotency(
    `payment:${idempotencyKey}`,
    () => active.charge(params),
    { scope: "payment.charge" }
  );
};

module.exports = {
  active,
  charge,
  refund: (...args) => active.refund(...args),
  isMoyasarConfigured,
};
