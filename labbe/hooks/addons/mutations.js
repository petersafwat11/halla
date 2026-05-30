"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";
import { addonsKeys } from "./keys";
import { subscriptionsKeys } from "@/hooks/subscriptions/keys";

const newIdempotencyKey = (prefix) => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

/**
 * Single-addon purchase (post-subscription). The bundled checkout flow uses
 * `useCheckout` instead — this hook is for a host who already has a plan and
 * wants to top up.
 */
export const usePurchaseAddon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      addonType,
      quantity,
      templateType,
      scope,
      eventId,
      subscriptionId,
      source,
    }) => {
      const idempotencyKey = newIdempotencyKey(`addon-${addonType}`);
      const data = await apiRequest({
        method: "POST",
        path: API_PATHS.addons.purchase,
        data: {
          addonType,
          ...(quantity !== undefined ? { quantity } : {}),
          ...(templateType ? { templateType } : {}),
          ...(scope ? { scope } : {}),
          ...(eventId ? { eventId } : {}),
          ...(subscriptionId ? { subscriptionId } : {}),
          ...(source ? { source } : {}),
        },
        headers: { "Idempotency-Key": idempotencyKey },
      });
      const inner = data?.data || data;
      if (
        inner?.requiresAction &&
        inner?.redirectUrl &&
        typeof window !== "undefined"
      ) {
        // 3DS: redirect now and hand back a sentinel so the caller
        // doesn't toast a fake success.
        window.location.href = inner.redirectUrl;
        return { requiresAction: true, paymentId: inner.paymentId };
      }
      return data;
    },
    onSuccess: (result) => {
      if (result?.requiresAction) return;
      queryClient.invalidateQueries({ queryKey: addonsKeys.all });
      queryClient.invalidateQueries({ queryKey: subscriptionsKeys.all });
    },
  });
};

/**
 * Admin-only: activate a `pending_provisioning` addon (e.g. business
 * customization). Idempotency-Key is sent to align with the route's
 * idempotency middleware.
 */
export const useAdminActivateAddon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ addonId, notes }) => {
      if (!addonId) throw new Error("addonId is required");
      const idempotencyKey = newIdempotencyKey(`addon-activate-${addonId}`);
      return apiRequest({
        method: "POST",
        path: API_PATHS.addons.adminActivate(addonId),
        data: notes ? { notes } : {},
        headers: { "Idempotency-Key": idempotencyKey },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: addonsKeys.all });
    },
  });
};
