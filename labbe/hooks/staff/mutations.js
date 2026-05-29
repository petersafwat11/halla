"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { staffService } from "@/services/staff";
import { legacyClientAdapter as apiClient } from "@/services/new-backend/legacyAdapter";
import { API_PATHS } from "@/services/new-backend/api.config";
import { staffKeys } from "./keys";
import { eventsKeys } from "@/hooks/events/keys";

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
          queryKey: staffKeys.guestsForEvent(eventId),
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
        queryKey: eventsKeys.staffTokens(eventId),
      });
    },
  });
};
