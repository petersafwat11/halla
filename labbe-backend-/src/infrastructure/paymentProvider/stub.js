/**
 * Stub payment provider.
 *
 * Returned by the factory whenever MOYASAR_API_KEY is unset. Returns
 * synthetic-success results so dev and CI flows can exercise the
 * subscription/addon code paths without hitting a real PSP.
 *
 * Shares SAR-validation contract with the Moyasar provider via
 * `moyasar._sarToHalalas`. Mirrors the new method surface added in
 * Phase 1 (charge, fetchPayment, refund, capture, voidPayment) so
 * service code is provider-agnostic.
 *
 * The stub honours `source.type === 'creditcard_3ds_test'` as a
 * deterministic 3DS path: charge returns `requires_action: true`
 * with a redirect URL pointing at our own
 * `/api/v2/payments/_stub/3ds-complete?id=<id>` endpoint. That
 * endpoint flips the in-memory record to `paid`. Useful in CI for
 * exercising the redirect-and-poll flow without a live Moyasar.
 */

const crypto = require("crypto");
const moyasarProvider = require("./moyasar");

const memoryStore = new Map();

const stubProvider = {
  name: "stub",

  async charge({ amount, currency = "SAR", source, metadata, callbackUrl, idempotencyKey, givenId } = {}) {
    moyasarProvider._sarToHalalas(amount);

    const transactionId = `stub-${crypto.randomBytes(8).toString("hex")}`;
    const requires3ds = source?.type === "creditcard_3ds_test";
    const status = requires3ds ? "initiated" : "paid";

    memoryStore.set(transactionId, {
      id: transactionId,
      status,
      amount: amount * 100,
      fee: 0,
      currency,
      refunded: 0,
      captured: 0,
      source: {
        type: source?.type || "creditcard",
        company: "visa",
        number: "**** **** **** 4242",
        month: 12,
        year: 2030,
      },
      metadata: metadata || {},
    });

    const finalGivenId =
      givenId ||
      (idempotencyKey ? moyasarProvider._deriveGivenId(idempotencyKey) : null);

    return {
      success: true,
      transactionId,
      status: requires3ds ? "requires_action" : "succeeded",
      providerStatus: status,
      requiresAction: requires3ds,
      redirectUrl: requires3ds
        ? `${process.env.FRONTEND_URL || "http://localhost:3000"}/host/payments/return?id=${transactionId}&stub=1`
        : null,
      amount,
      fee: 0,
      givenId: finalGivenId,
      paymentMethod: {
        type: source?.type === "creditcard_3ds_test" ? "creditcard" : source?.type || "creditcard",
        company: "visa",
        last4: "4242",
      },
      provider: "stub",
    };
  },

  async fetchPayment(id) {
    const data = memoryStore.get(id);
    if (!data) return { success: false, error: "not found", provider: "stub" };
    return { success: true, data, provider: "stub" };
  },

  async refund({ moyasarPaymentId, amount }) {
    const data = memoryStore.get(moyasarPaymentId);
    if (!data) return { success: false, error: "not found", provider: "stub" };
    const refundHalalas = typeof amount === "number" ? amount * 100 : data.amount - data.refunded;
    data.refunded += refundHalalas;
    data.status = data.refunded >= data.amount ? "refunded" : "paid";
    return {
      success: true,
      provider: "stub",
      transactionId: moyasarPaymentId,
      providerStatus: data.status,
      refundedAmount: data.refunded / 100,
    };
  },

  async capture({ moyasarPaymentId, amount }) {
    const data = memoryStore.get(moyasarPaymentId);
    if (!data) return { success: false, error: "not found", provider: "stub" };
    data.captured = typeof amount === "number" ? amount * 100 : data.amount;
    data.status = "captured";
    return {
      success: true,
      provider: "stub",
      providerStatus: "captured",
      capturedAmount: data.captured / 100,
    };
  },

  async voidPayment({ moyasarPaymentId }) {
    const data = memoryStore.get(moyasarPaymentId);
    if (!data) return { success: false, error: "not found", provider: "stub" };
    data.status = "voided";
    return { success: true, provider: "stub", providerStatus: "voided" };
  },

  async createInvoice({ amount, currency = "SAR", description, callbackUrl, metadata }) {
    moyasarProvider._sarToHalalas(amount);
    const invoiceId = `stub-inv-${crypto.randomBytes(8).toString("hex")}`;
    return {
      success: true,
      invoiceId,
      url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/host/payments/return?id=${invoiceId}&stub=1`,
      providerStatus: "initiated",
      provider: "stub",
    };
  },

  async fetchInvoice(invoiceId) {
    return { success: true, data: { id: invoiceId, status: "initiated" }, provider: "stub" };
  },

  // For 3DS-complete test endpoint
  _setStubStatus(id, status) {
    const data = memoryStore.get(id);
    if (data) data.status = status;
    return data;
  },
};

module.exports = stubProvider;
