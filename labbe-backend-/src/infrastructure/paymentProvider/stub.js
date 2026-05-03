/**
 * Stub payment provider.
 *
 * Phase 1b: returned by the factory whenever `MOYASAR_API_KEY` is unset.
 * Returns a synthetic-success result so dev and CI flows can exercise the
 * subscription/addon code paths without hitting a real PSP. The fake
 * `transactionId` is a hex string so logs can grep it as `stub-<random>`.
 *
 * The stub enforces the same SAR major-unit contract as the Moyasar
 * provider — a non-SAR or out-of-precision amount fails loudly in dev/CI
 * before it reaches prod. We delegate to `moyasar._sarToHalalas` so the
 * validation rules stay in one place.
 */

const crypto = require("crypto");
const moyasarProvider = require("./moyasar");

const stubProvider = {
  name: "stub",

  async charge({ amount, currency = "SAR", customer, metadata }) {
    // Validate SAR input the same way the real provider does. We discard
    // the halalas value — the stub doesn't actually charge anything; the
    // call is just a guardrail.
    moyasarProvider._sarToHalalas(amount);

    const transactionId = `stub-${crypto.randomBytes(8).toString("hex")}`;
    return {
      success: true,
      transactionId,
      status: "succeeded",
      providerStatus: "paid",
      provider: "stub",
    };
  },

  async refund() {
    return { success: true, provider: "stub" };
  },
};

module.exports = stubProvider;
