import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import checkoutService from "../../services/checkoutService";

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
    mutationFn: async ({ planCode, addons = [], discountCode, source, callbackUrl }) => {
      const data = await checkoutService.checkout({
        planCode,
        addons,
        discountCode,
        source,
        callbackUrl,
      });
      const inner = data?.data || data;
      if (inner?.requiresAction && inner?.redirectUrl) {
        await persistPendingCheckoutCart(inner.paymentId, {
          planCode,
          addons,
          discountCode: discountCode || null,
        });
        await Linking.openURL(inner.redirectUrl);
        return { requiresAction: true, paymentId: inner.paymentId };
      }
      return inner;
    },
    onSuccess: async (result) => {
      if (result?.requiresAction) return;
      await clearPendingCheckoutCart();
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["addons"] });
      queryClient.invalidateQueries({ queryKey: ["events", "subscription-info"] });
    },
  });
};
