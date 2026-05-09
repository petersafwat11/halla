"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { buildMutationOptions } from "./_shared";

// Action keys handled by this sub-mutation. Exported so the façade can
// route requests to the right hook without duplicating the list.
export const CRUD_ACTIONS = ["createEvent", "deleteEvent", "bulkDeleteEvents"];

const buildMutations = (queryClient) => ({
  // Create Event — wraps the multi-step wizard payload in FormData so the
  // template image (if any) rides on the same request as the JSON fields.
  createEvent: {
    mutationFn: (eventData) => {
      const formData = new FormData();
      if (eventData.eventDetails) formData.append("eventDetails", JSON.stringify(eventData.eventDetails));
      if (eventData.guestList) formData.append("guestList", JSON.stringify(eventData.guestList));
      if (eventData.staffList) formData.append("staffList", JSON.stringify(eventData.staffList));
      if (eventData.visualTemplate) formData.append("visualTemplate", JSON.stringify(eventData.visualTemplate));
      if (eventData.taqnyatTemplate) formData.append("taqnyatTemplate", JSON.stringify(eventData.taqnyatTemplate));
      if (eventData.guestReplies) formData.append("guestReplies", JSON.stringify(eventData.guestReplies));
      if (eventData.launchSettings) formData.append("launchSettings", JSON.stringify(eventData.launchSettings));
      if (eventData.templateImage instanceof File) {
        formData.append("templateImage", eventData.templateImage);
      }

      return apiRequest({
        method: "POST",
        path: API_PATHS.events.createEvent,
        data: formData,
        config: { headers: { "Content-Type": "multipart/form-data" } },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  },

  // Delete Event
  deleteEvent: {
    mutationFn: (eventId) =>
      apiRequest({
        method: "DELETE",
        path: API_PATHS.events.deleteEvent(eventId),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  },

  // Bulk Delete Events
  bulkDeleteEvents: {
    mutationFn: (eventIds) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.events.bulkDeleteEvents,
        data: { eventIds },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  },
});

export const useEventCrudMutation = (action) => {
  const queryClient = useQueryClient();
  const mutationConfig = buildMutations(queryClient)[action];
  if (!mutationConfig) {
    throw new Error(`Unknown event CRUD action: ${action}`);
  }
  return useMutation(buildMutationOptions(mutationConfig));
};

export default useEventCrudMutation;
