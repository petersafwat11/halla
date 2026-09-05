"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";
import { subscriptionsKeys } from "@/hooks/subscriptions/keys";
import { addonsKeys } from "@/hooks/addons/keys";
import { eventsKeys } from "@/hooks/events/keys";

const CHECKOUT_CART_STORAGE_KEY = "halla.checkout.pendingCart";

/**
 * Stash the pending checkout cart so a 3DS round-trip can resume the UI.
 * The backend already persists the intent on the Payment row — this client
 * stash exists only to drive a "your subscription + addons activated"
 * confirmation surface after the user returns from the bank.
 */
export const persistPendingCheckoutCart = (paymentId, cart) => {
  if (typeof window === "undefined" || !paymentId) return;
  try {
    sessionStorage.setItem(
      CHECKOUT_CART_STORAGE_KEY,
      JSON.stringify({ paymentId, cart, savedAt: Date.now() })
    );
  } catch {
    /* sessionStorage unavailable — intent still lives on the backend */
  }
};

export const readPendingCheckoutCart = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CHECKOUT_CART_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const clearPendingCheckoutCart = () => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CHECKOUT_CART_STORAGE_KEY);
  } catch {
    /* noop */
  }
};

/**
 * Bundled plan + addons + discount checkout via POST /payments/checkout.
 * Charges the combined total as one Moyasar transaction, redirects on 3DS,
 * and invalidates subscription / addon caches on success.
 */
export const useCheckout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      planCode,
      addons = [],
      discountCode,
      source,
      callbackUrl,
      expectedAmount,
      expectedTotal,
      quoteId,
      quoteExpiresAt,
    }) => {
      if (!planCode) throw new Error("planCode is required");
      if (!quoteId || !quoteExpiresAt) throw new Error("A current checkout quote is required");
      const idempotencyKey = `checkout-${quoteId}`;
      const data = await apiRequest({
        method: "POST",
        path: API_PATHS.hostPayments.checkout,
        data: {
          planCode,
          addons,
          ...(discountCode ? { discountCode } : {}),
          ...(source ? { source } : {}),
          ...(callbackUrl ? { callbackUrl } : {}),
          ...(expectedAmount != null ? { expectedAmount } : {}),
          ...(expectedTotal != null ? { expectedTotal } : {}),
          ...(quoteId ? { quoteId } : {}),
          ...(quoteExpiresAt ? { quoteExpiresAt } : {}),
        },
        headers: { "Idempotency-Key": idempotencyKey },
      });
      const inner = data?.data || data;
      if (
        inner?.requiresAction &&
        inner?.redirectUrl &&
        typeof window !== "undefined"
      ) {
        // Persist the cart so the post-3DS confirmation UI knows what was
        // ordered, then redirect. The backend already stashed the intent on
        // Payment.metadata.pendingCheckoutIntent.
        persistPendingCheckoutCart(inner.paymentId, {
          planCode,
          addons,
          discountCode: discountCode || null,
        });
        window.location.href = inner.redirectUrl;
        return { requiresAction: true, paymentId: inner.paymentId };
      }
      return inner;
    },
    onSuccess: (result) => {
      if (result?.requiresAction) return;
      clearPendingCheckoutCart();
      queryClient.invalidateQueries({ queryKey: subscriptionsKeys.all });
      queryClient.invalidateQueries({ queryKey: addonsKeys.all });
      queryClient.invalidateQueries({ queryKey: eventsKeys.subscriptionInfo() });
    },
  });
};
