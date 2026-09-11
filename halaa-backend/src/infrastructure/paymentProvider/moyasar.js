/**
 * Moyasar payment provider — full integration.
 *
 * Surface area:
 *   charge({ amount, currency, source, customer, metadata,
 *           callbackUrl, manual, givenId, idempotencyKey })
 *     POST /v1/payments
 *
 *   fetchPayment(moyasarPaymentId)
 *     GET /v1/payments/:id
 *
 *   refund({ moyasarPaymentId, amount })
 *     POST /v1/payments/:id/refund
 *
 *   capture({ moyasarPaymentId, amount })
 *     POST /v1/payments/:id/capture
 *
 *   voidPayment({ moyasarPaymentId })
 *     POST /v1/payments/:id/void
 *
 *   createInvoice({ amount, currency, description, callbackUrl, metadata })
 *     POST /v1/invoices
 *
 *   fetchInvoice(invoiceId)
 *     GET /v1/invoices/:id
 *
 * AMOUNT CONTRACT
 *   `amount` is SAR major units (29.99 = 29.99 SAR). The provider
 *   converts to halalas internally. This module is the only place
 *   that knows about halalas.
 *
 * IDEMPOTENCY
 *   Moyasar's documented mechanism is `given_id` (UUID v4 in the
 *   request body). We accept either a caller-supplied `givenId` or
 *   derive a stable UUIDv4-shaped hash from `idempotencyKey` so the
 *   same logical request always gets the same `given_id`.
 */

const axios = require("axios");
const crypto = require("crypto");
const { ValidationError } = require("../../shared/errors/errorTypes");

const MOYASAR_BASE = process.env.MOYASAR_BASE_URL || "https://api.moyasar.com/v1";

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
  const rounded = Math.round(sarAmount * 100);
  if (Math.abs(rounded / 100 - sarAmount) > 1e-9) {
    throw new ValidationError(
      "paymentProvider.charge: amount has more than 2 decimal places"
    );
  }
  return rounded;
};

const halalasToSar = (h) => (typeof h === "number" ? h / 100 : 0);

/**
 * Derive a deterministic UUID v4-shaped string from an arbitrary
 * idempotency key so the same logical request always presents the
 * same `given_id` to Moyasar. Pure function; no side effects.
 */
const deriveGivenId = (key) => {
  const hex = crypto.createHash("sha256").update(String(key)).digest("hex").slice(0, 32);
  // Layout the bytes as UUID v4 (version=4, variant=10xx).
  const part1 = hex.slice(0, 8);
  const part2 = hex.slice(8, 12);
  const part3 = "4" + hex.slice(13, 16);
  const yChar = (parseInt(hex.slice(16, 17), 16) & 0x3) | 0x8;
  const part4 = yChar.toString(16) + hex.slice(17, 20);
  const part5 = hex.slice(20, 32);
  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
};

const extractPaymentMethod = (data = {}) => {
  const src = data.source || {};
  const out = { type: src.type || null };
  if (src.company) out.company = src.company;
  if (typeof src.number === "string" && src.number.length >= 4) {
    out.last4 = src.number.slice(-4);
    out.bin = src.number.slice(0, 6);
  }
  if (typeof src.month === "number") out.expiryMonth = src.month;
  if (typeof src.year === "number") out.expiryYear = src.year;
  if (src.issuer_name) out.issuerName = src.issuer_name;
  if (src.issuer_country) out.issuerCountry = src.issuer_country;
  return out;
};

const auth = () => ({
  username: process.env.MOYASAR_API_KEY,
  password: "",
});

const moyasarProvider = {
  name: "moyasar",

  /**
   * Charge a customer.
   */
  async charge({
    amount,
    currency = "SAR",
    source,
    customer,
    metadata,
    callbackUrl,
    manual = false,
    givenId,
    idempotencyKey,
    description,
    returnRaw = false,
  } = {}) {
    const halalas = sarToHalalas(amount);

    if (!process.env.MOYASAR_API_KEY) {
      return { success: false, error: "MOYASAR_API_KEY missing", provider: "moyasar" };
    }

    if (!source || typeof source !== "object" || !source.type) {
      return {
        success: false,
        error: "paymentProvider.charge: `source` is required (e.g. { type: 'creditcard', ... })",
        provider: "moyasar",
      };
    }

    if ((source.type === "creditcard" || source.type === "token") && !callbackUrl) {
      return {
        success: false,
        error: "paymentProvider.charge: `callbackUrl` required for creditcard/token sources",
        provider: "moyasar",
      };
    }

    const finalGivenId = givenId || (idempotencyKey ? deriveGivenId(idempotencyKey) : undefined);

    const body = {
      amount: halalas,
      currency,
      source,
      description: description || metadata?.description || "Halaa payment",
      metadata: metadata || {},
    };
    if (callbackUrl) body.callback_url = callbackUrl;
    if (manual) body.manual = true;
    if (finalGivenId) body.given_id = finalGivenId;

    try {
      const response = await axios.post(`${MOYASAR_BASE}/payments`, body, {
        auth: auth(),
        timeout: 15000,
      });
      const data = response.data || {};
      const status = data.status;
      const requiresAction = status === "initiated";
      const success = status === "paid" || status === "authorized" || requiresAction;

      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.log("[moyasar] charge response:", { id: data.id, status, halalas, sar: amount });
      }

      return {
        success,
        transactionId: data.id,
        status: requiresAction
          ? "requires_action"
          : status === "authorized"
          ? "authorized"
          : success
          ? "succeeded"
          : "failed",
        providerStatus: status,
        requiresAction,
        redirectUrl: requiresAction ? data.source?.transaction_url || null : null,
        amount,
        fee: typeof data.fee === "number" ? data.fee : 0,
        givenId: finalGivenId || null,
        paymentMethod: extractPaymentMethod(data),
        raw: returnRaw ? data : undefined,
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

  async fetchPayment(moyasarPaymentId) {
    if (!process.env.MOYASAR_API_KEY) {
      return { success: false, error: "MOYASAR_API_KEY missing", provider: "moyasar" };
    }
    if (!moyasarPaymentId) {
      return { success: false, error: "moyasarPaymentId required", provider: "moyasar" };
    }
    try {
      const response = await axios.get(`${MOYASAR_BASE}/payments/${moyasarPaymentId}`, {
        auth: auth(),
        timeout: 15000,
      });
      return { success: true, data: response.data, provider: "moyasar" };
    } catch (err) {
      return {
        success: false,
        provider: "moyasar",
        error: err.response?.data?.message || err.message,
        statusCode: err.response?.status,
      };
    }
  },

  async refund({ moyasarPaymentId, amount }) {
    if (!process.env.MOYASAR_API_KEY) {
      return { success: false, error: "MOYASAR_API_KEY missing", provider: "moyasar" };
    }
    if (!moyasarPaymentId) {
      return { success: false, error: "moyasarPaymentId required", provider: "moyasar" };
    }
    const body = {};
    if (typeof amount === "number") body.amount = sarToHalalas(amount);

    try {
      const response = await axios.post(
        `${MOYASAR_BASE}/payments/${moyasarPaymentId}/refund`,
        body,
        { auth: auth(), timeout: 15000 }
      );
      const data = response.data || {};
      return {
        success: data.status === "refunded" || (data.refunded || 0) > 0,
        provider: "moyasar",
        transactionId: data.id,
        providerStatus: data.status,
        refundedAmount: halalasToSar(data.refunded || 0),
        raw: data,
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

  async capture({ moyasarPaymentId, amount }) {
    if (!process.env.MOYASAR_API_KEY) {
      return { success: false, error: "MOYASAR_API_KEY missing", provider: "moyasar" };
    }
    const body = {};
    if (typeof amount === "number") body.amount = sarToHalalas(amount);
    try {
      const response = await axios.post(
        `${MOYASAR_BASE}/payments/${moyasarPaymentId}/capture`,
        body,
        { auth: auth(), timeout: 15000 }
      );
      const data = response.data || {};
      return {
        success: data.status === "captured" || data.status === "paid",
        provider: "moyasar",
        transactionId: data.id,
        providerStatus: data.status,
        capturedAmount: halalasToSar(data.captured || 0),
        raw: data,
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

  async voidPayment({ moyasarPaymentId }) {
    if (!process.env.MOYASAR_API_KEY) {
      return { success: false, error: "MOYASAR_API_KEY missing", provider: "moyasar" };
    }
    try {
      const response = await axios.post(
        `${MOYASAR_BASE}/payments/${moyasarPaymentId}/void`,
        {},
        { auth: auth(), timeout: 15000 }
      );
      const data = response.data || {};
      return {
        success: data.status === "voided",
        provider: "moyasar",
        transactionId: data.id,
        providerStatus: data.status,
        raw: data,
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

  // ─── INVOICES (recurring billing + admin payment links) ──────
  // `amount` is SAR major units. `amountHalalas` is the explicit minor-unit
  // path for payment-links so integer halalas are never converted twice.
  async createInvoice({
    amount,
    amountHalalas,
    currency = "SAR",
    description,
    callbackUrl,
    successUrl,
    backUrl,
    expireAt,
    metadata,
  }) {
    if (!process.env.MOYASAR_API_KEY) {
      return { success: false, error: "MOYASAR_API_KEY missing", provider: "moyasar" };
    }
    let halalas;
    try {
      if (amountHalalas !== undefined && amountHalalas !== null) {
        if (!Number.isSafeInteger(amountHalalas) || amountHalalas <= 0) {
          throw new ValidationError(
            "paymentProvider.createInvoice: amountHalalas must be a positive safe integer"
          );
        }
        halalas = amountHalalas;
      } else {
        halalas = sarToHalalas(amount);
      }
    } catch (e) {
      return {
        success: false,
        provider: "moyasar",
        error: e.message,
        statusCode: 400,
      };
    }
    try {
      const body = {
        amount: halalas,
        currency,
        description,
        callback_url: callbackUrl,
        metadata: metadata || {},
      };
      // success_url/back_url are browser redirects; callback_url is the
      // server notification. Keep them separate per Moyasar docs.
      if (successUrl) body.success_url = successUrl;
      if (backUrl) body.back_url = backUrl;
      if (expireAt) body.expired_at = expireAt;
      const response = await axios.post(`${MOYASAR_BASE}/invoices`, body, {
        auth: auth(),
        timeout: 15000,
      });
      const data = response.data || {};
      return {
        success: true,
        invoiceId: data.id,
        url: data.url,
        providerStatus: data.status,
        raw: data,
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

  // Dedicated minor-unit wrapper — preserves exact integer halalas.
  async createInvoiceMinor(params = {}) {
    return this.createInvoice(params);
  },

  async cancelInvoice(invoiceId) {
    if (!process.env.MOYASAR_API_KEY) {
      return { success: false, error: "MOYASAR_API_KEY missing", provider: "moyasar" };
    }
    if (!invoiceId) {
      return { success: false, error: "invoiceId required", provider: "moyasar" };
    }
    try {
      const response = await axios.put(
        `${MOYASAR_BASE}/invoices/${encodeURIComponent(invoiceId)}/cancel`,
        {},
        { auth: auth(), timeout: 15000 }
      );
      const data = response.data || {};
      return {
        success: true,
        invoiceId: data.id || invoiceId,
        providerStatus: data.status,
        raw: data,
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

  // Metadata-filtered lookup for creation recovery. `metadata` is encoded as
  // `metadata[key]=value` query params; paging via `page`/`per`.
  async listInvoices({ metadata = {}, page = 1, per = 25 } = {}) {
    if (!process.env.MOYASAR_API_KEY) {
      return { success: false, error: "MOYASAR_API_KEY missing", provider: "moyasar" };
    }
    try {
      const params = { page };
      for (const [k, v] of Object.entries(metadata)) {
        params[`metadata[${k}]`] = v;
      }
      const response = await axios.get(`${MOYASAR_BASE}/invoices`, {
        auth: auth(),
        timeout: 15000,
        params,
      });
      const data = response.data || {};
      const invoices = Array.isArray(data.invoices) ? data.invoices : Array.isArray(data) ? data : [];
      return {
        success: true,
        invoices,
        totalPages: data.total_pages,
        meta: data.meta || null,
        raw: data,
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

  async fetchInvoice(invoiceId) {
    if (!process.env.MOYASAR_API_KEY) {
      return { success: false, error: "MOYASAR_API_KEY missing", provider: "moyasar" };
    }
    try {
      const response = await axios.get(`${MOYASAR_BASE}/invoices/${encodeURIComponent(invoiceId)}`, {
        auth: auth(),
        timeout: 15000,
      });
      return { success: true, data: response.data, provider: "moyasar" };
    } catch (err) {
      return {
        success: false,
        provider: "moyasar",
        error: err.response?.data?.message || err.message,
        statusCode: err.response?.status,
      };
    }
  },

  // Exposed for tests
  _sarToHalalas: sarToHalalas,
  _halalasToSar: halalasToSar,
  _deriveGivenId: deriveGivenId,
  _extractPaymentMethod: extractPaymentMethod,
};

module.exports = moyasarProvider;
