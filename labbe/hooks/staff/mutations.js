"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { staffService } from "@/services/staff";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";
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
      const response = await apiRequest({
        method: "POST",
        path: API_PATHS.events.revokeStaffAccess(eventId, staffId),
        data: {},
        config: { headers: { "Idempotency-Key": idempotencyKey } },
      });
      return response.data || response;
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({
        queryKey: eventsKeys.staffTokens(eventId),
      });
    },
  });
};
