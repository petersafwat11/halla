"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { staffService } from "@/services/staff";
// Phase 3: migrated from the legacy fetch-based `apiClient` to the
// canonical axios pipeline via legacyAdapter.
import { legacyClientAdapter as apiClient } from "@/services/new-backend/legacyAdapter";
import { API_PATHS } from "@/services/new-backend/api.config";

// ============================================
// STAFF QUERIES
// ============================================

/**
 * Hook to fetch event guests for staff portal.
 * @param {string} eventId
 * @param {{search?: string, status?: string, page?: number, limit?: number}} [filters]
 */
export const useStaffEventGuests = (eventId, filters = {}, options = {}) => {
  const { search = "", status = "", page = 1, limit = 50 } = filters;
  return useQuery({
    queryKey: ["staff", "guests", eventId, { search, status, page, limit }],
    queryFn: async () => {
      const response = await staffService.getGuests(eventId, {
        search,
        status,
        page,
        limit,
      });
      return response.data || { guests: [], stats: {}, pagination: {} };
    },
    enabled: !!eventId,
    staleTime: 30 * 1000,
    ...options,
  });
};

/**
 * Hook to list staff access tokens for an event (host-facing).
 */
export const useEventStaffTokens = (eventId, options = {}) => {
  return useQuery({
    queryKey: ["events", eventId, "staff-tokens"],
    queryFn: async () => {
      const response = await apiClient.get(
        API_PATHS.events.listStaffTokens(eventId)
      );
      return response.data || { tokens: [] };
    },
    enabled: !!eventId,
    staleTime: 30 * 1000,
    ...options,
  });
};

// ============================================
// STAFF MUTATIONS
// ============================================

/**
 * Unified staff mutation hook.
 * @param {"checkInGuest"} action
 */
export const useStaffMutation = (action) => {
  const queryClient = useQueryClient();

  const mutations = {
    checkInGuest: {
      mutationFn: ({ eventId, qrCode, guestId, phone }) => {
        if (qrCode) return staffService.checkInByQR(eventId, qrCode);
        if (guestId) return staffService.checkInById(eventId, guestId);
        return staffService.checkInByPhone(eventId, phone);
      },
      onSuccess: (_, { eventId }) => {
        queryClient.invalidateQueries({
          queryKey: ["staff", "guests", eventId],
        });
      },
    },
  };

  const mutationConfig = mutations[action];
  if (!mutationConfig) {
    throw new Error(`Unknown staff action: ${action}`);
  }

  return useMutation(mutationConfig);
};

/**
 * Mutation hook to revoke a staff member's access tokens (host-facing).
 */
export const useRevokeStaffAccess = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, staffId }) => {
      const idempotencyKey = `staff-revoke-${eventId}-${staffId}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;
      const response = await apiClient.post(
        API_PATHS.events.revokeStaffAccess(eventId, staffId),
        {},
        { headers: { "Idempotency-Key": idempotencyKey } }
      );
      return response.data || response;
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({
        queryKey: ["events", eventId, "staff-tokens"],
      });
    },
  });
};
