import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import {
  getProfileAPI,
  getNotificationPreferencesAPI
} from '../../services/settingsService';
import subscriptionService from '../../services/subscriptionService';
import { getSubscriptionInfo as getSubscriptionInfoAPI } from '../../services/eventsService2';

/**
 * Hook to fetch user profile
 */
export function useProfile() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: () => getProfileAPI(token),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch user notification settings
 * @returns {Object} Query result with notification settings
 */
export function useNotificationSettings() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ['user', 'notification-settings'],
    queryFn: async () => {
      const response = await getNotificationPreferencesAPI(token);
      return response.data;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch user subscription info
 * @returns {Object} Query result with subscription data
 */
export function useSubscription() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ['subscription', 'info'],
    queryFn: async () => {
      const response = await subscriptionService.getMySubscription(token);
      return response;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch enriched subscription info with dynamic event counting
 * Use this for event-limit pre-checks (has canCreateEvent from server-side dynamic count)
 */
export function useSubscriptionInfo() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ['subscription', 'event-info'],
    queryFn: async () => {
      const response = await getSubscriptionInfoAPI(token);
      return response?.data || response;
    },
    enabled: !!token,
    staleTime: 2 * 60 * 1000,
  });
}
