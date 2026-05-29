import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Linking } from "react-native";
import addonsService from "../../services/addonsService";
import { addonsKeys } from "./keys";

/**
 * Single-addon top-up purchase. The bundled checkout flow uses
 * useCheckout() instead — this is for hosts already on a plan.
 */
export const useAddonPurchase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input) => {
      const data = await addonsService.purchase(input);
      const inner = data?.data || data;
      if (inner?.requiresAction && inner?.redirectUrl) {
        await Linking.openURL(inner.redirectUrl);
        return { requiresAction: true, paymentId: inner.paymentId };
      }
      return data;
    },
    onSuccess: (result) => {
      if (result?.requiresAction) return;
      queryClient.invalidateQueries({ queryKey: addonsKeys.all });
      // Cross-domain: subscription factory doesn't exist on mobile yet — literal stays.
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
};

export const useAddonAdminActivate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ addonId, notes }) =>
      addonsService.adminActivate(addonId, notes ? { notes } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: addonsKeys.all });
    },
  });
};
