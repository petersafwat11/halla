import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import subscriptionService from '../../services/subscriptionService';

/**
 * Hook to subscribe to a plan
 * @returns {Object} Mutation object
 */
export function useSubscribe() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async (subscriptionData) => {
      return subscriptionService.subscribe(subscriptionData, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}

/**
 * Hook to upgrade/change subscription plan
 * @returns {Object} Mutation object
 */
export function useUpgradeSubscription() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async (upgradeData) => {
      return subscriptionService.upgrade(upgradeData, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}

/**
 * Hook to cancel subscription
 * @returns {Object} Mutation object
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async (cancelData = {}) => {
      return subscriptionService.cancel(cancelData, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}
