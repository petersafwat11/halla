import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ENDPOINTS } from "../../config/api";
import { apiFetch } from "../../services/http";
import { buildMoyasarCallbackUrl, runThreeDsSession } from "../../utils/paymentBrowser";
import { addonsKeys } from "../addons/keys";
import { eventsKeys } from "../events/keys";
import { subscriptionsKeys } from "../subscriptions/keys";

const CHECKOUT_CART_STORAGE_KEY = "halla.checkout.pendingCart";

/**
 * Stash the pending checkout cart so a 3DS round-trip can resume the UI
 * after the user returns. The backend already persists the intent on
 * Payment.metadata.pendingCheckoutIntent — this stash exists only for the
 * post-redirect confirmation surface.
 */
export const persistPendingCheckoutCart = async (paymentId, cart) => {
  if (!paymentId) return;
  try {
    await AsyncStorage.setItem(
      CHECKOUT_CART_STORAGE_KEY,
      JSON.stringify({ paymentId, cart, savedAt: Date.now() })
    );
  } catch {
    /* AsyncStorage unavailable — backend still has the intent */
  }
};

export const readPendingCheckoutCart = async () => {
  try {
    const raw = await AsyncStorage.getItem(CHECKOUT_CART_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const clearPendingCheckoutCart = async () => {
  try {
    await AsyncStorage.removeItem(CHECKOUT_CART_STORAGE_KEY);
  } catch {
    /* noop */
  }
};

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
      // Hand Moyasar our public bounce endpoint (http[s], as Moyasar
      // requires) instead of the web default that strands mobile users on
      // the website login. It 302s back to the app's deep link. Callers may
      // still override with an explicit callbackUrl.
      const moyasarCallback = callbackUrl || buildMoyasarCallbackUrl();
      const body = {
        planCode,
        addons,
        ...(discountCode ? { discountCode } : {}),
        ...(source ? { source } : {}),
        ...(expectedAmount != null ? { expectedAmount } : {}),
        ...(expectedTotal != null ? { expectedTotal } : {}),
        ...(quoteId ? { quoteId } : {}),
        ...(quoteExpiresAt ? { quoteExpiresAt } : {}),
        callbackUrl: moyasarCallback,
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
      const inner = data?.data || data;
      if (inner?.requiresAction && inner?.redirectUrl) {
        await persistPendingCheckoutCart(inner.paymentId, {
          planCode,
          addons,
          discountCode: discountCode || null,
        });
        // Run 3DS in an in-app browser sheet that auto-closes on return.
        //
        // This browser handoff is the ONE mobile-only leg with no web
        // analogue (web completes 3DS via a same-origin redirect). Isolate
        // its failures so callers can surface the real reason instead of the
        // generic "subscription failed" fallback. In particular, Expo Go does
        // not register the `halaa://` return scheme, so openAuthSessionAsync
        // can reject here — which a dev/standalone build fixes. Tagging the
        // error makes that diagnosable from the toast/console.
        let session;
        try {
          session = await runThreeDsSession(inner.redirectUrl, inner.paymentId);
        } catch (threeDsErr) {
          const reason =
            threeDsErr?.message ||
            threeDsErr?.name ||
            String(threeDsErr) ||
            "unknown";
          const err = new Error(`3DS_LAUNCH_FAILED: ${reason}`);
          err.code = "THREE_DS_LAUNCH_FAILED";
          err.cause = threeDsErr;
          err.paymentId = inner.paymentId;
          throw err;
        }
        return {
          requiresAction: true,
          paymentId: inner.paymentId,
          moyasarId: session.moyasarId,
          browserType: session.browserType,
        };
      }
      return inner;
    },
    onSuccess: async (result) => {
      if (result?.requiresAction) return;
      await clearPendingCheckoutCart();
      queryClient.invalidateQueries({ queryKey: subscriptionsKeys.all });
      queryClient.invalidateQueries({ queryKey: addonsKeys.all });
      queryClient.invalidateQueries({ queryKey: eventsKeys.subscriptionInfo() });
    },
  });
};
