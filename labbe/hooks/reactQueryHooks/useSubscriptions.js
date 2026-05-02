"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

// ============================================
// SUBSCRIPTIONS QUERIES
// ============================================

/**
 * Hook to fetch my subscription
 * @returns {UseQueryResult}
 */
export const useMySubscription = (options = {}) => {
  return useQuery({
    queryKey: ["subscriptions", "my-subscription"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.subscriptions.getMySubscription,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to validate package limits
 * @returns {UseQueryResult}
 */
export const useValidateLimits = (action, count, options = {}) => {
  return useQuery({
    queryKey: ["subscriptions", "validate-limits", action, count],
    queryFn: () =>
      apiRequest({
        method: "POST",
        path: API_PATHS.subscriptions.validateLimits,
        data: { action, count },
      }),
    staleTime: 2 * 60 * 1000,
    enabled: !!action,
    ...options,
  });
};

// ============================================
// SUBSCRIPTIONS MUTATIONS
// ============================================

/**
 * Unified Subscriptions Mutation Hook
 * @param {string} action - The subscription action to perform
 * @returns {UseMutationResult}
 */
export const useSubscriptionMutation = (action) => {
  const queryClient = useQueryClient();

  const mutations = {
    // Subscribe to plan
    subscribe: {
      mutationFn: ({ planId, data }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.subscriptions.subscribe,
          data: { planId, ...data },
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
        queryClient.invalidateQueries({ queryKey: ["events", "subscription-info"] });
      },
    },

    // Change plan (upgrade/downgrade)
    upgrade: {
      mutationFn: ({ planId, data }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.subscriptions.changePlan,
          data: { planCode: planId, ...data },
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
        queryClient.invalidateQueries({ queryKey: ["events", "subscription-info"] });
      },
    },

    // Cancel subscription
    cancel: {
      mutationFn: () =>
        apiRequest({
          method: "POST",
          path: API_PATHS.subscriptions.cancelSubscription,
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      },
    },
  };

  const mutationConfig = mutations[action];

  if (!mutationConfig) {
    throw new Error(`Unknown subscription action: ${action}`);
  }

  return useMutation({
    ...mutationConfig,
    onError: (error) => {
      console.error(`Subscription mutation error (${action}):`, error);
    },
  });
};
