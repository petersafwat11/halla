import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ENDPOINTS } from "../../config/api";
import { addonsKeys } from "./keys";
import { subscriptionsKeys } from "../subscriptions/keys";
import { eventsKeys } from "../events/keys";
import { addonsRequest } from "./queries";
import { buildMoyasarCallbackUrl, runThreeDsSession } from "../../utils/paymentBrowser";

const newIdempotencyKey = (prefix) => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

/**
 * Single-addon top-up purchase. The bundled checkout flow uses
 * useCheckout() instead — this is for hosts already on a plan.
 */
export const useAddonPurchase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input) => {
      const idempotencyKey = newIdempotencyKey(`addon-${input.addonType}`);
      // Send Moyasar our public bounce endpoint (http[s], 302s to the app
      // deep link) so 3DS returns to the app, not the website login.
      const moyasarCallback = input.callbackUrl || buildMoyasarCallbackUrl();
      const data = await addonsRequest(ENDPOINTS.ADDONS.PURCHASE, {
        method: "POST",
        body: { ...input, callbackUrl: moyasarCallback },
        headers: { "Idempotency-Key": idempotencyKey },
      });
      const inner = data?.data || data;
      if (inner?.requiresAction && inner?.redirectUrl) {
        const { moyasarId, browserType } = await runThreeDsSession(
          inner.redirectUrl,
          inner.paymentId
        );
        return {
          requiresAction: true,
          paymentId: inner.paymentId,
          moyasarId,
          browserType,
        };
      }
      return data;
    },
    onSuccess: (result) => {
      if (result?.requiresAction) return;
      queryClient.invalidateQueries({ queryKey: addonsKeys.all });
      queryClient.invalidateQueries({ queryKey: subscriptionsKeys.all });
      queryClient.invalidateQueries({ queryKey: eventsKeys.subscriptionInfo() });
    },
  });
};

export const useAddonAdminActivate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ addonId, notes }) => {
      if (!addonId) throw new Error("addonId is required");
      const idempotencyKey = newIdempotencyKey(`addon-activate-${addonId}`);
      return addonsRequest(ENDPOINTS.ADDONS.ADMIN_ACTIVATE(addonId), {
        method: "POST",
        body: notes ? { notes } : {},
        headers: { "Idempotency-Key": idempotencyKey },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: addonsKeys.all });
    },
  });
};
