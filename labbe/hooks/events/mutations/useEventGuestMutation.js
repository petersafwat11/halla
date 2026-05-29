"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { buildMutationOptions } from "./_shared";

// Action keys handled by this sub-mutation. Guest add/update/delete
// have moved to the canonical `useGuestMutation` factory in
// `hooks/guests/`.
export const GUEST_ACTIONS = ["updateGuestList"];

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
