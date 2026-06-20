"use client";

import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";

/**
 * Submit a hosted business checkout. Mirrors the host `useCheckout` 3DS
 * handling: if the backend returns `{ requiresAction, redirectUrl }` we send
 * the browser to the bank's 3DS page; otherwise the assignment + subscription
 * came back activated.
 *
 * `callbackUrl` is where Moyasar returns the user after 3DS — the caller
 * passes the public return page for this token.
 */
export const useBusinessCheckoutSubmit = (token) => {
  return useMutation({
    mutationFn: async ({ source, callbackUrl }) => {
      const response = await apiRequest({
        method: "POST",
        path: API_PATHS.business.checkoutSubmit(token),
        data: { source, callbackUrl },
      });
      const inner = response?.data || response;

      if (
        inner?.requiresAction &&
        inner?.redirectUrl &&
        typeof window !== "undefined"
      ) {
        window.location.href = inner.redirectUrl;
        return { requiresAction: true, redirectUrl: inner.redirectUrl };
      }
      return inner;
    },
  });
};
