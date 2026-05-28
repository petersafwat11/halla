import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as staffService from "../../services/staffService";
import { revokeStaffAccess } from "../../services/eventsService";

/**
 * Verify staff access via phone+eventId (or token, when supported).
 */
export function useVerifyStaffAccess() {
  return useMutation({
    mutationFn: async ({ phone, eventId, token }) => {
      if (token) return staffService.verifyByToken(token);
      return staffService.verifyByPhone(phone, eventId);
    },
  });
}

/**
 * Check in a guest. Accepts exactly one of `qrCode`, `guestId`, or `phone`.
 * Invalidates the staff guest list on success.
 */
export function useCheckInGuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, qrCode, guestId, phone }) => {
      if (qrCode) return staffService.checkInByQR(eventId, qrCode);
      if (guestId) return staffService.checkInById(eventId, guestId);
      return staffService.checkInByPhone(eventId, phone);
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({
        queryKey: ["staff", "guests", eventId],
      });
    },
  });
}

/**
 * Revoke a staff member's access tokens (host-facing).
 */
export function useRevokeStaffAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, staffId }) => {
      return revokeStaffAccess(eventId, staffId);
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({
        queryKey: ["events", eventId, "staff-tokens"],
      });
    },
  });
}
