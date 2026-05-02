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
 */

const axios = require("axios");

const MOYASAR_BASE = process.env.MOYASAR_BASE_URL || "https://api.moyasar.com/v1";

const moyasarProvider = {
  name: "moyasar",

  async charge({ amount, currency = "SAR", customer, metadata, idempotencyKey }) {
    if (!process.env.MOYASAR_API_KEY) {
      return { success: false, error: "MOYASAR_API_KEY missing", provider: "moyasar" };
    }

    try {
      const response = await axios.post(
        `${MOYASAR_BASE}/payments`,
        {
          amount: Math.round(amount * 100), // Moyasar takes minor units
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
      return {
        success: payment.status === "paid" || payment.status === "authorized",
        transactionId: payment.id,
        provider: "moyasar",
        amount,
        currency,
        customer: customer?.id || customer || null,
        raw: payment,
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
