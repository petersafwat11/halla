"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

// ============================================
// STAFF QUERIES
// ============================================

/**
 * Hook to verify staff access
 * @returns {UseQueryResult}
 */
export const useVerifyStaffAccess = (options = {}) => {
  return useQuery({
    queryKey: ["staff", "verify-access"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.staff.verifyStaffAccess,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch event guests for staff
 * @param {string} eventId
 * @returns {UseQueryResult}
 */
export const useStaffEventGuests = (eventId, options = {}) => {
  return useQuery({
    queryKey: ["staff", "events", eventId, "guests"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.staff.getEventGuests(eventId),
      }),
    enabled: !!eventId,
    staleTime: 30 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch event stats for staff
 * @param {string} eventId
 * @returns {UseQueryResult}
 */
export const useStaffEventStats = (eventId, options = {}) => {
  return useQuery({
    queryKey: ["staff", "events", eventId, "stats"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.staff.getEventStats(eventId),
      }),
    enabled: !!eventId,
    staleTime: 30 * 1000,
    ...options,
  });
};

// ============================================
// STAFF MUTATIONS
// ============================================

/**
 * Unified Staff Mutation Hook
 * @param {string} action - The staff action to perform
 * @returns {UseMutationResult}
 */
export const useStaffMutation = (action) => {
  const queryClient = useQueryClient();

  const mutations = {
    // Check-in guest
    checkInGuest: {
      mutationFn: ({ eventId, qrCode, guestId, phone }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.staff.checkInGuest(eventId),
          data: qrCode ? { qrCode } : guestId ? { guestId } : { phone },
        }),
      onSuccess: (_, { eventId }) => {
        queryClient.invalidateQueries({ queryKey: ["staff", "events", eventId] });
      },
    },

    // Manual check-in (by code/QR)
    manualCheckIn: {
      mutationFn: ({ eventId, guestId, note, overrideDeclined }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.staff.manualCheckIn(eventId),
          data: { guestId, note, overrideDeclined },
        }),
      onSuccess: (_, { eventId }) => {
        queryClient.invalidateQueries({ queryKey: ["staff", "events", eventId] });
      },
    },
  };

  const mutationConfig = mutations[action];

  if (!mutationConfig) {
    throw new Error(`Unknown staff action: ${action}`);
  }

  return useMutation({
    ...mutationConfig,
    onError: (error) => {
      console.error(`Staff mutation error (${action}):`, error);
    },
  });
};
