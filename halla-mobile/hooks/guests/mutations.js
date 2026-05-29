import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addGuest,
  updateGuest,
  deleteGuest,
  rotateGuestQr,
  revokeGuestAccess,
  exportEventGuests,
} from "../../services/eventGuestsService";
import { guestsKeys } from "./keys";
import { eventsKeys } from "../events/keys";

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
    mutationFn: ({ eventId, data }) => addGuest(eventId, data),
    onSuccess: (_data, variables) =>
      _invalidateGuests(queryClient, variables?.eventId),
  });
}

export function useUpdateGuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, guestId, data }) =>
      updateGuest(eventId, guestId, data),
    onSuccess: (_data, variables) =>
      _invalidateGuests(queryClient, variables?.eventId),
  });
}

export function useDeleteGuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, guestId }) => deleteGuest(eventId, guestId),
    onSuccess: (_data, variables) =>
      _invalidateGuests(queryClient, variables?.eventId),
  });
}

export function useRotateGuestQr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, guestId }) => rotateGuestQr(eventId, guestId),
    onSuccess: (_data, variables) =>
      _invalidateGuests(queryClient, variables?.eventId),
  });
}

export function useRevokeGuestAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, guestId }) => revokeGuestAccess(eventId, guestId),
    onSuccess: (_data, variables) =>
      _invalidateGuests(queryClient, variables?.eventId),
  });
}

export function useExportGuests() {
  return useMutation({
    mutationFn: ({ eventId }) => exportEventGuests(eventId),
  });
}
