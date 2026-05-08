"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { buildMutationOptions } from "./_shared";

// Action keys handled by this sub-mutation.
export const GUEST_ACTIONS = [
  "addGuest",
  "updateGuest",
  "deleteGuest",
  "updateGuestList",
];

const buildMutations = (queryClient) => ({
  // Replace the entire guest list for an event.
  updateGuestList: {
    mutationFn: ({ eventId, data }) =>
      apiRequest({
        method: "PATCH",
        path: API_PATHS.events.updateGuestList(eventId),
        data,
      }),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["guests", "events", eventId] });
    },
  },

  // Add Guest to Event
  addGuest: {
    mutationFn: ({ eventId, guestData }) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.events.addGuestToEvent(eventId),
        data: guestData,
      }),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["guests", "events", eventId] });
    },
  },

  // Update Event Guest
  updateGuest: {
    mutationFn: ({ eventId, guestId, data }) =>
      apiRequest({
        method: "PUT",
        path: API_PATHS.events.updateEventGuest(eventId, guestId),
        data,
      }),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["guests", "events", eventId] });
    },
  },

  // Delete Event Guest
  deleteGuest: {
    mutationFn: ({ eventId, guestId }) =>
      apiRequest({
        method: "DELETE",
        path: API_PATHS.events.deleteEventGuest(eventId, guestId),
      }),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["guests", "events", eventId] });
    },
  },
});

export const useEventGuestMutation = (action) => {
  const queryClient = useQueryClient();
  const mutationConfig = buildMutations(queryClient)[action];
  if (!mutationConfig) {
    throw new Error(`Unknown event guest action: ${action}`);
  }
  return useMutation(buildMutationOptions(mutationConfig));
};

export default useEventGuestMutation;
