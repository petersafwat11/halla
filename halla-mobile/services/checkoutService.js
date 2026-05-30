/**
 * Checkout Service
 *
 * Wraps POST /payments/checkout (bundled plan + addons + discount). Throws
 * on non-2xx via the apiFetch wrapper.
 */

import { ENDPOINTS } from "../config/api";
import { apiFetch } from "./http";

const newIdempotencyKey = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `checkout-${crypto.randomUUID()}`;
  }
  return `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

class CheckoutService {
  async checkout({ planCode, addons = [], discountCode, source, callbackUrl }) {
    if (!planCode) throw new Error("planCode is required");

    const idempotencyKey = newIdempotencyKey();
    const body = {
      planCode,
      addons,
      ...(discountCode ? { discountCode } : {}),
      ...(source ? { source } : {}),
      ...(callbackUrl ? { callbackUrl } : {}),
    };

    const response = await apiFetch(ENDPOINTS.PAYMENTS.CHECKOUT, {
      method: "POST",
      body,
      headers: { "Idempotency-Key": idempotencyKey },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.message || "Checkout failed");
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }
}

export default new CheckoutService();
