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
 * AMOUNT UNIT CONTRACT (B-2)
 * ───────────────────────────────────────────────────────────────────────
 * The Halla project stores prices in **SAR major units** (Saudi Riyals).
 * `pricing.oneTime` on PlanModel and `price` on Addon are SAR — for
 * example `29` means `29.00 SAR`, and `99.99` means `99.99 SAR`.
 *
 * Moyasar's API expects amounts in **halalas** (1 SAR = 100 halalas), as
 * a positive integer. We do the SAR → halalas conversion HERE so callers
 * never have to think about minor units. Same contract applies to the
 * stub provider — both validate the SAR input the same way.
 *
 *   caller  →  amount: 29.99 (SAR)
 *   moyasar →  amount_minor: 2999 (halalas, sent to Moyasar)
 *
 * Validation rules on the SAR input:
 *   - finite number
 *   - >= 0 (we reject 0 only for free plans at the caller level — the
 *     provider rejects 0 because Moyasar does too)
 *   - at most 2 decimal places (SAR/halalas precision; 0.001 SAR is not
 *     a real amount)
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

/**
 * Validate a SAR major-unit amount and convert to halalas (minor units).
 *
 * Returns the integer halalas value Moyasar expects. Throws
 * `ValidationError` on bad input — caller surfaces a generic
 * "Payment failed" to the user, but the validator message is logged
 * server-side for ops triage (see H-11).
 */
const sarToHalalas = (sarAmount) => {
  if (typeof sarAmount !== "number" || !Number.isFinite(sarAmount)) {
    throw new ValidationError(
      "paymentProvider.charge: amount must be a finite SAR number"
    );
  }
  if (sarAmount <= 0) {
    throw new ValidationError(
      "paymentProvider.charge: amount must be > 0 SAR (free plans must skip the charge step)"
    );
  }
  // Reject more than 2 decimal places. 29.999 SAR is not a real price; if
  // it arrives, something rounded badly upstream and we want to surface
  // it instead of silently truncating.
  const rounded = Math.round(sarAmount * 100);
  const reconstructed = rounded / 100;
  if (Math.abs(reconstructed - sarAmount) > 1e-9) {
    throw new ValidationError(
      "paymentProvider.charge: amount has more than 2 decimal places (SAR has 2-decimal precision)"
    );
  }
  return rounded;
};

const moyasarProvider = {
  name: "moyasar",

  /**
   * Charge a customer.
   *
   * @param {Object}   params
   * @param {number}   params.amount         REQUIRED. SAR major units —
   *                                          e.g. `29` (= 29.00 SAR) or
   *                                          `99.99` (= 99.99 SAR). The
   *                                          provider converts to halalas
   *                                          internally.
   * @param {string}   [params.currency]     ISO-4217 code. Default "SAR".
   *                                          Non-SAR currencies will work
   *                                          with Moyasar but Halla's
   *                                          pricing stores SAR; cross-
   *                                          currency conversion is out
   *                                          of scope for this provider.
   * @param {Object}   [params.customer]
   * @param {Object}   [params.metadata]
   * @param {string}   [params.idempotencyKey]
   * @param {string}   [params.paymentMethod]
   * @returns {Promise<{success:boolean, transactionId?:string, status?:string,
   *   providerStatus?:string, provider:string, error?:string}>}
   */
  async charge({ amount, currency = "SAR", customer, metadata, idempotencyKey }) {
    // Validate SAR input + convert to halalas. Throws on bad input.
    const halalas = sarToHalalas(amount);

    if (!process.env.MOYASAR_API_KEY) {
      return { success: false, error: "MOYASAR_API_KEY missing", provider: "moyasar" };
    }

    try {
      const response = await axios.post(
        `${MOYASAR_BASE}/payments`,
        {
          amount: halalas, // halalas (Moyasar's required unit)
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
          amountHalalas: halalas,
          amountSar: amount,
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

  // Exposed for the stub + tests so both providers share validation.
  _sarToHalalas: sarToHalalas,
};

module.exports = moyasarProvider;
