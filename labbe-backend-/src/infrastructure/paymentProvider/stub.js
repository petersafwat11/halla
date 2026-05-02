/**
 * Stub payment provider.
 *
 * Phase 1b: returned by the factory whenever `MOYASAR_API_KEY` is unset.
 * Returns a synthetic-success result so dev and CI flows can exercise the
 * subscription/addon code paths without hitting a real PSP. The fake
 * `transactionId` is a hex string so logs can grep it as
 * `stub-<random>`.
 *
 * The stub enforces the same `amount`-is-minor-units contract as the
 * Moyasar provider (see `moyasar.js`). This way bugs that pass major
 * units (e.g. `29.99`) fail loudly in dev/CI before they reach prod.
 */

const crypto = require("crypto");
const { ValidationError } = require("../../shared/errors/errorTypes");

const assertMinorUnits = (amount) => {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    throw new ValidationError(
      "paymentProvider.charge: amount must be a finite number (minor units, integer)"
    );
  }
  if (!Number.isInteger(amount)) {
    throw new ValidationError(
      "paymentProvider.charge: amount must be an integer in minor units (halalas/cents) — no decimals"
    );
  }
  if (amount <= 0) {
    throw new ValidationError(
      "paymentProvider.charge: amount must be a positive integer in minor units"
    );
  }
};

const stubProvider = {
  name: "stub",

  async charge({ amount, currency = "SAR", customer, metadata }) {
    assertMinorUnits(amount);
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
