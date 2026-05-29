import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import {
  getProfileAPI,
  getNotificationPreferencesAPI,
} from "../../services/settingsService";
import subscriptionService from "../../services/subscriptionService";
import { getSubscriptionInfo as getSubscriptionInfoAPI } from "../../services/eventsService";
import { usersKeys, subscriptionInfoKeys } from "./keys";
import { subscriptionsKeys } from "../subscriptions/keys";

/**
 * Fetch user profile.
 */
export function useProfile() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: usersKeys.profile(),
    queryFn: () => getProfileAPI(),
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
      const response = await getNotificationPreferencesAPI();
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
    queryFn: () => subscriptionService.getMySubscription(),
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
      const response = await getSubscriptionInfoAPI(token);
      return response?.data || response;
    },
    enabled: !!token,
    staleTime: 2 * 60 * 1000,
  });
}
