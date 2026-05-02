/**
 * Stub payment provider.
 *
 * Phase 1b: returned by the factory whenever `MOYASAR_API_KEY` is unset.
 * Returns a synthetic-success result so dev and CI flows can exercise the
 * subscription/addon code paths without hitting a real PSP. The fake
 * `transactionId` is a hex string so logs can grep it as
 * `stub-<random>`.
 */

const crypto = require("crypto");

const stubProvider = {
  name: "stub",

  async charge({ amount, currency, customer, metadata }) {
    const transactionId = `stub-${crypto.randomBytes(8).toString("hex")}`;
    return {
      success: true,
      transactionId,
      provider: "stub",
      amount,
      currency,
      customer: customer?.id || customer || null,
      metadata: metadata || {},
    };
  },

  async refund() {
    return { success: true, provider: "stub" };
  },
};

module.exports = stubProvider;
