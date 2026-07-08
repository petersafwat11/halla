import { useQuery } from "@tanstack/react-query";
import { ENDPOINTS } from "../../config/api";
import { useAuthStore } from "../../stores/authStore";
import { eventsRequest } from "../events/queries";
import { subscriptionsKeys } from "../subscriptions/keys";
import { subscriptionsRequest } from "../subscriptions/queries";
import { settingsApi, usersApi } from "./_api";
import { subscriptionInfoKeys, usersKeys } from "./keys";

/**
 * Fetch user profile.
 */
export function useProfile() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: usersKeys.profile(),
    queryFn: () => usersApi.getProfile(),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch user notification settings.
 */
export function useNotificationSettings() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: usersKeys.notificationSettings(),
    queryFn: async () => {
      const response = await settingsApi.getNotificationPreferences();
      return response.data?.preferences;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch the calling user's active subscription. Mirrors web `useMySubscription`.
 * (Living here on mobile because it shares the user-info surface; web has it
 * in `hooks/subscriptions/`. Keep both code paths in sync semantically.)
 */
export function useMySubscription() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: [...subscriptionsKeys.all, "my-subscription"],
    queryFn: () =>
      subscriptionsRequest(ENDPOINTS.SUBSCRIPTIONS.MY_SUBSCRIPTION, {
        method: "GET",
      }),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Enriched subscription info with dynamic event counting (server-side
 * canCreateEvent). Use for event-limit pre-checks. Read endpoint lives
 * in the events module, not subscriptions.
 */
export function useSubscriptionInfo() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: subscriptionInfoKeys.eventInfo(),
    queryFn: async () => {
      const response = await eventsRequest(ENDPOINTS.EVENTS.SUBSCRIPTION_INFO);
      return response?.data || response;
    },
    enabled: !!token,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Business create-event gate (B4-MOBILE).
 *
 * Create-event is subscription-gated server-side (a business with no active
 * subscription gets a 403). This hook surfaces that to the UI so the
 * create-event entry can be disabled/redirected instead of bouncing the user
 * into the wizard only to fail on submit.
 *
 * Only business accounts with no active subscription are blocked here. Personal
 * hosts (and active businesses) keep their existing event-limit checks
 * downstream; this gate intentionally does NOT duplicate per-plan usage limits.
 *
 * Returns `{ blocked, isLoading }`. `blocked` is conservative: while the
 * subscription query is still in flight we report `false` so we never wrongly
 * block a personal host on a slow network.
 */
export function useBusinessCreateEventGate() {
  const isBusiness = useAuthStore((state) => state.isBusiness());
  const { data: subscriptionData, isLoading } = useMySubscription();

  const hasActiveSubscription = !!subscriptionData?.data?.subscription;

  return {
    blocked: isBusiness && !isLoading && !hasActiveSubscription,
    isLoading,
  };
}
