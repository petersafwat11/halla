/**
 * Subscription Store
 * Zustand store for subscription state management
 */

import { create } from "zustand";
import subscriptionService from "../services/subscriptionService";
import plansService from "../services/plansService";
import {
  parseApiError,
  requiresUpgrade,
  requiresSubscription,
} from "../utils/errorHandler";

const initialState = {
  subscription: null,
  usage: null,
  plans: null,
  loading: false,
  error: null,
  lastFetched: null,
};

export const useSubscriptionStore = create((set, get) => ({
  ...initialState,

  /**
   * Fetch current subscription
   * @param {string} token - Auth token
   */
  fetchSubscription: async (token) => {
    set({ loading: true, error: null });
    try {
      const response = await subscriptionService.getMySubscription(token);
      set({
        subscription: response.data,
        loading: false,
        lastFetched: Date.now(),
      });
      return { success: true, data: response.data };
    } catch (error) {
      const parsedError = parseApiError(error);
      set({ error: parsedError, loading: false });
      return { success: false, error: parsedError };
    }
  },

  /**
   * Fetch usage stats
   * @param {string} token - Auth token
   */
  fetchUsageStats: async (token) => {
    try {
      const response = await subscriptionService.getUsageStats(token);
      set({ usage: response.data });
      return { success: true, data: response.data };
    } catch (error) {
      console.error("[SUBSCRIPTION STORE] Failed to fetch usage:", error);
      return { success: false, error: parseApiError(error) };
    }
  },

  /**
   * Fetch host plans
   */
  fetchPlans: async () => {
    try {
      const response = await plansService.getHostPlans();
      set({ plans: response.data });
      return { success: true, data: response.data };
    } catch (error) {
      console.error("[SUBSCRIPTION STORE] Failed to fetch plans:", error);
      return { success: false, error: parseApiError(error) };
    }
  },

  /**
   * Create subscription
   * @param {Object} subscriptionData - Subscription details
   * @param {string} token - Auth token
   */
  subscribe: async (subscriptionData, token) => {
    set({ loading: true, error: null });
    try {
      const response = await subscriptionService.subscribe(
        subscriptionData,
        token,
      );
      set({
        subscription: response.data,
        loading: false,
      });
      return { success: true, data: response.data };
    } catch (error) {
      const parsedError = parseApiError(error);
      set({ error: parsedError, loading: false });
      return { success: false, error: parsedError };
    }
  },

  /**
   * Upgrade subscription
   * @param {Object} upgradeData - Upgrade details
   * @param {string} token - Auth token
   */
  upgrade: async (upgradeData, token) => {
    set({ loading: true, error: null });
    try {
      const response = await subscriptionService.upgrade(upgradeData, token);
      set({
        subscription: response.data,
        loading: false,
      });
      return { success: true, data: response.data };
    } catch (error) {
      const parsedError = parseApiError(error);
      set({ error: parsedError, loading: false });
      return { success: false, error: parsedError };
    }
  },

  /**
   * Cancel subscription
   * @param {Object} cancelData - Cancellation details
   * @param {string} token - Auth token
   */
  cancel: async (cancelData, token) => {
    set({ loading: true, error: null });
    try {
      const response = await subscriptionService.cancel(cancelData, token);
      set({
        subscription: response.data,
        loading: false,
      });
      return { success: true, data: response.data };
    } catch (error) {
      const parsedError = parseApiError(error);
      set({ error: parsedError, loading: false });
      return { success: false, error: parsedError };
    }
  },

  /**
   * Check if user can create an event
   * @returns {Object} { allowed, reason, remaining }
   */
  canCreateEvent: () => {
    const { subscription, usage } = get();

    if (!subscription) {
      return { allowed: false, reason: "No subscription", remaining: 0 };
    }

    if (subscription.status !== "active" && subscription.status !== "trial") {
      return {
        allowed: false,
        reason: "Subscription not active",
        remaining: 0,
      };
    }

    const limits = usage?.limits || subscription.limits;
    if (!limits) {
      return { allowed: true, remaining: -1 };
    }

    const maxEvents = limits.maxEvents;
    if (maxEvents === -1) {
      return { allowed: true, remaining: -1 };
    }

    const eventsCreated = usage?.usage?.eventsCreated || 0;
    const remaining = Math.max(0, maxEvents - eventsCreated);

    if (remaining <= 0) {
      return {
        allowed: false,
        reason: "Event limit reached",
        limit: maxEvents,
        remaining: 0,
      };
    }

    return { allowed: true, remaining };
  },

  /**
   * Check if user can add guests
   * @param {number} count - Number of guests to add
   * @returns {Object} { allowed, reason, limit }
   */
  canAddGuests: (count) => {
    const { subscription, usage } = get();

    if (!subscription) {
      return { allowed: false, reason: "No subscription", limit: 0 };
    }

    const limits = usage?.limits || subscription.limits;
    if (!limits) {
      return { allowed: true, limit: -1 };
    }

    const maxGuests = limits.invitePool ?? limits.maxInvitesPerEvent;
    if (maxGuests === -1) {
      return { allowed: true, limit: -1 };
    }

    if (count > maxGuests) {
      return {
        allowed: false,
        reason: `Guest limit exceeded. Maximum ${maxGuests} guests allowed.`,
        limit: maxGuests,
      };
    }

    return { allowed: true, limit: maxGuests };
  },

  /**
   * Get subscription status display info
   * @returns {Object} { label, color }
   */
  getStatusDisplay: () => {
    const { subscription } = get();
    if (!subscription) {
      return { labelAr: "غير مشترك", labelEn: "Not subscribed", color: "gray" };
    }

    const statusMap = {
      active: { labelAr: "نشط", labelEn: "Active", color: "green" },
      trial: { labelAr: "تجريبي", labelEn: "Trial", color: "blue" },
      expired: { labelAr: "منتهي", labelEn: "Expired", color: "red" },
      cancelled: { labelAr: "ملغي", labelEn: "Cancelled", color: "gray" },
      past_due: { labelAr: "متأخر", labelEn: "Past Due", color: "orange" },
      completed: { labelAr: "مكتمل", labelEn: "Completed", color: "purple" },
    };

    return statusMap[subscription.status] || statusMap.active;
  },

  /**
   * Check if subscription needs attention (expiring soon, limits near)
   * @returns {Object} { needsAttention, reason, action }
   */
  checkSubscriptionHealth: () => {
    const { subscription, usage } = get();

    if (!subscription) {
      return {
        needsAttention: true,
        reason: "no_subscription",
        action: "subscribe",
      };
    }

    if (
      subscription.status === "expired" ||
      subscription.status === "cancelled"
    ) {
      return {
        needsAttention: true,
        reason: "subscription_inactive",
        action: "renew",
      };
    }

    // Check if expiring soon (within 7 days)
    if (
      subscription.daysRemaining !== undefined &&
      subscription.daysRemaining <= 7 &&
      subscription.daysRemaining >= 0
    ) {
      return {
        needsAttention: true,
        reason: "expiring_soon",
        daysRemaining: subscription.daysRemaining,
        action: "renew",
      };
    }

    // Check if near event limit
    const eventCheck = get().canCreateEvent();
    if (
      !eventCheck.allowed ||
      (eventCheck.remaining !== -1 && eventCheck.remaining <= 1)
    ) {
      return {
        needsAttention: true,
        reason: "event_limit_near",
        remaining: eventCheck.remaining,
        action: "upgrade",
      };
    }

    return { needsAttention: false };
  },

  /**
   * Clear subscription data
   */
  clear: () => set(initialState),

  /**
   * Clear error
   */
  clearError: () => set({ error: null }),

  /**
   * Refresh subscription data
   * @param {string} token - Auth token
   */
  refresh: async (token) => {
    await Promise.all([
      get().fetchSubscription(token),
      get().fetchUsageStats(token),
    ]);
  },
}));

export default useSubscriptionStore;
