import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ENDPOINTS } from "../../config/api";
import { apiFetch } from "../../services/http";
import { eventsKeys } from "../events/keys";
import { guestsKeys } from "./keys";
import { guestsFetch } from "./queries";

const _idempotencyKey = (label, eventId, guestId) =>
  `${label}-${eventId}-${guestId}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;

/**
 * Invalidate every cache slice that depends on guest state for a given
 * event: the canonical guest list and the single-event stats query the
 * host screen polls.
 */
const _invalidateGuests = (queryClient, eventId) => {
  queryClient.invalidateQueries({ queryKey: guestsKeys.all });
  if (eventId) {
    queryClient.invalidateQueries({
      queryKey: eventsKeys.singleStats(eventId),
    });
  }
};

export function useAddGuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, data }) => {
      if (!eventId) throw new Error("eventId is required");
      const res = await guestsFetch(
        ENDPOINTS.GUESTS.EVENT_GUESTS(eventId),
        { method: "POST", body: data },
        "Failed to add guest",
      );
      return res?.data?.guest ?? res?.data ?? res;
    },
    onSuccess: (_data, variables) =>
      _invalidateGuests(queryClient, variables?.eventId),
  });
}

export function useUpdateGuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, guestId, data }) => {
      if (!eventId || !guestId) {
        throw new Error("eventId and guestId are required");
      }
      const res = await guestsFetch(
        `${ENDPOINTS.GUESTS.EVENT_GUESTS(eventId)}/guests/${guestId}`,
        { method: "PATCH", body: data || {} },
        "Failed to update guest",
      );
      return res?.data?.guest ?? res?.data ?? res;
    },
    onSuccess: (_data, variables) =>
      _invalidateGuests(queryClient, variables?.eventId),
  });
}

export function useDeleteGuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, guestId }) => {
      if (!eventId || !guestId) {
        throw new Error("eventId and guestId are required");
      }
      await guestsFetch(
        `${ENDPOINTS.GUESTS.EVENT_GUESTS(eventId)}/guests/${guestId}`,
        { method: "DELETE" },
        "Failed to delete guest",
      );
    },
    onSuccess: (_data, variables) =>
      _invalidateGuests(queryClient, variables?.eventId),
  });
}

export function useRotateGuestQr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, guestId }) => {
      if (!eventId || !guestId) {
        throw new Error("eventId and guestId are required");
      }
      const res = await guestsFetch(
        ENDPOINTS.GUESTS.ROTATE_QR(eventId, guestId),
        {
          method: "POST",
          headers: {
            "Idempotency-Key": _idempotencyKey("qr-rotate", eventId, guestId),
          },
        },
        "Failed to rotate QR",
      );
      return res?.data ?? res;
    },
    onSuccess: (_data, variables) =>
      _invalidateGuests(queryClient, variables?.eventId),
  });
}

export function useRevokeGuestAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, guestId }) => {
      if (!eventId || !guestId) {
        throw new Error("eventId and guestId are required");
      }
      const res = await guestsFetch(
        ENDPOINTS.GUESTS.REVOKE_ACCESS(eventId, guestId),
        {
          method: "POST",
          headers: {
            "Idempotency-Key": _idempotencyKey("gat-revoke", eventId, guestId),
          },
        },
        "Failed to revoke guest access",
      );
      return res?.data ?? res;
    },
    onSuccess: (_data, variables) =>
      _invalidateGuests(queryClient, variables?.eventId),
  });
}

export function useExportGuests() {
  return useMutation({
    mutationFn: async ({ eventId }) => {
      if (!eventId) throw new Error("eventId is required");
      const response = await apiFetch(ENDPOINTS.GUESTS.EXPORT(eventId), {
        method: "GET",
        timeoutMs: 60 * 1000,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to export guests");
      }
      const blob = await response.blob();
      return {
        success: true,
        blob,
        filename: `event-${eventId}-guests.xlsx`,
      };
    },
  });
}
