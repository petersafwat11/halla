/**
 * Moyasar payment provider — real implementation.
 *
 * Phase 1b: this module is loaded only when `MOYASAR_API_KEY` is set. It
 * makes the production HTTP call to Moyasar's `/v1/payments` endpoint.
 * If the request fails we surface a non-throwing `{ success:false }`
 * result so subscription / addon code paths can decide how to retry.
 *
 * The full integration (3D-secure flows, webhook reconciliation, refunds)
 * lives in a follow-up ticket once Peter has live keys.
 *
 * ───────────────────────────────────────────────────────────────────────
 * AMOUNT UNIT CONTRACT (post-B-2 fix)
 * ───────────────────────────────────────────────────────────────────────
 * `amount` MUST be a positive integer expressed in MINOR UNITS of the
 * `currency` (halalas for SAR, cents for USD/EUR/AED, fils for KWD/BHD,
 * etc.). The provider passes it straight through to Moyasar — there is
 * NO `* 100` conversion here. Callers that have a major-unit value
 * (e.g. `2999.00 SAR`) MUST convert before calling: `Math.round(sar * 100)`.
 *
 * Why: previously this file did `Math.round(amount * 100)`, but the unit
 * of the input `amount` was never documented. If a caller already stored
 * `2999` meaning halalas, the customer was charged 100×. The provider is
 * now strict: non-integer or non-positive amounts throw `ValidationError`
 * before we hit the network.
 *
 * RESPONSE SHAPE (post-M-3 fix)
 * The success response intentionally OMITS Moyasar's full `raw` payload.
 * The raw object contains card-adjacent data (last4, BIN, etc.) and is
 * cached for 24h by the idempotency layer in `IdempotencyKey.response.body`
 * — caching it would constitute incidental sensitive-data retention.
 * For server-side debugging the raw payload is logged once before being
 * dropped from the public return.
 */

const axios = require("axios");
const { ValidationError } = require("../../shared/errors/errorTypes");

const MOYASAR_BASE = process.env.MOYASAR_BASE_URL || "https://api.moyasar.com/v1";

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

const moyasarProvider = {
  name: "moyasar",

  /**
   * Charge a customer.
   *
   * @param {Object}   params
   * @param {number}   params.amount         REQUIRED. Positive integer in
   *                                          minor units of `currency`
   *                                          (halalas for SAR, cents for
   *                                          USD/EUR, etc.). NOT major
   *                                          units — `29.99` is invalid.
   * @param {string}   [params.currency]     ISO-4217 code. Default "SAR".
   * @param {Object}   [params.customer]
   * @param {Object}   [params.metadata]
   * @param {string}   [params.idempotencyKey]
   * @param {string}   [params.paymentMethod]
   * @returns {Promise<{success:boolean, transactionId?:string, status?:string,
   *   providerStatus?:string, provider:string, error?:string}>}
   */
  async charge({ amount, currency = "SAR", customer, metadata, idempotencyKey }) {
    assertMinorUnits(amount);

    if (!process.env.MOYASAR_API_KEY) {
      return { success: false, error: "MOYASAR_API_KEY missing", provider: "moyasar" };
    }

    try {
      const response = await axios.post(
        `${MOYASAR_BASE}/payments`,
        {
          amount, // already minor units — pass-through, no `* 100`
          currency,
          description: metadata?.description || "Halla subscription/addon",
          metadata: metadata || {},
        },
        {
          auth: { username: process.env.MOYASAR_API_KEY, password: "" },
          headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
          timeout: 15000,
        }
      );

      const payment = response.data || {};
      const providerStatus = payment.status;
      const success = providerStatus === "paid" || providerStatus === "authorized";

      // Internal-only: log raw for debugging. Do NOT include in the
      // returned object — that object is cached by the idempotency layer.
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.log("[moyasar] charge raw response:", {
          id: payment.id,
          status: providerStatus,
        });
      }

      return {
        success,
        transactionId: payment.id,
        status: success ? "succeeded" : "failed",
        providerStatus,
        provider: "moyasar",
      };
    } catch (err) {
      return {
        success: false,
        provider: "moyasar",
        error: err.response?.data?.message || err.message,
        statusCode: err.response?.status,
      };
    }
  },

  async refund(/* params */) {
    return { success: false, provider: "moyasar", error: "Refund flow not yet implemented" };
  },
};

module.exports = moyasarProvider;
