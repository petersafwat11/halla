"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

// ============================================
// GUESTS QUERIES
// ============================================

/**
 * Hook to fetch event guests
 * @param {string} eventId
 * @returns {UseQueryResult}
 */
export const useEventGuests = (eventId, options = {}) => {
  return useQuery({
    queryKey: ["events", eventId, "guests"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.guests.getEventGuests(eventId),
      }),
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch guest by token (for RSVP)
 * @param {string} token
 * @returns {UseQueryResult}
 */
export const useGuestByToken = (token, options = {}) => {
  return useQuery({
    queryKey: ["guests", "token", token],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.guests.getByInvitationCode(token),
      }),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch guest invitation details
 * @param {string} invitationToken
 * @returns {UseQueryResult}
 */
export const useGuestInvitation = (invitationToken, options = {}) => {
  return useQuery({
    queryKey: ["guests", "invitation", invitationToken],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.guests.getByInvitationCode(invitationToken),
      }),
    enabled: !!invitationToken,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

// ============================================
// GUESTS MUTATIONS
// ============================================

/**
 * Unified Guests Mutation Hook
 * @param {string} action - The guest action to perform
 * @returns {UseMutationResult}
 */
export const useGuestMutation = (action) => {
  const queryClient = useQueryClient();

  const mutations = {
    // RSVP to Event
    rsvp: {
      mutationFn: ({ token, response, data }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.guests.submitRSVP(token),
          data: { response, ...data },
        }),
      onSuccess: (_, { token }) => {
        queryClient.invalidateQueries({ queryKey: ["guests", "token", token] });
      },
    },
  };

  const mutationConfig = mutations[action];

  if (!mutationConfig) {
    throw new Error(`Unknown guest action: ${action}`);
  }

  return useMutation({
    ...mutationConfig,
    onError: (error) => {
      console.error(`Guest mutation error (${action}):`, error);
    },
  });
};
