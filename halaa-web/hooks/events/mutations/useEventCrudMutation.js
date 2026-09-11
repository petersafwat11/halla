"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";
import { toBulkIdsPayload } from "@halaa/shared/utils/adapters";
import { buildMutationOptions } from "./_shared";
import { eventsKeys } from "../keys";
import { dashboardKeys } from "@/hooks/dashboard/keys";

// Action keys handled by this sub-mutation. Exported so the façade can
// route requests to the right hook without duplicating the list.
export const CRUD_ACTIONS = ["createEvent", "deleteEvent", "bulkDeleteEvents"];

const buildMutations = (queryClient) => ({
  // Create Event — wraps the multi-step wizard payload in FormData so the
  // template image (if any) rides on the same request as the JSON fields.
  createEvent: {
    mutationFn: (variables) => {
      const eventData = variables?.eventData || variables;
      const idempotencyKey = variables?.idempotencyKey;

      const formData = new FormData();
      if (eventData.eventDetails) formData.append("eventDetails", JSON.stringify(eventData.eventDetails));
      if (eventData.guestList) formData.append("guestList", JSON.stringify(eventData.guestList));
      if (eventData.staffList) formData.append("staffList", JSON.stringify(eventData.staffList));
      if (eventData.visualTemplate) formData.append("visualTemplate", JSON.stringify(eventData.visualTemplate));
      if (eventData.taqnyatTemplate) formData.append("taqnyatTemplate", JSON.stringify(eventData.taqnyatTemplate));
      if (eventData.guestReplies) formData.append("guestReplies", JSON.stringify(eventData.guestReplies));
      // Scalar string field — backend reads it directly (no JSON parse).
      if (eventData.invitationType) formData.append("invitationType", eventData.invitationType);
      if (eventData.launchSettings) formData.append("launchSettings", JSON.stringify(eventData.launchSettings));
      if (eventData.templateImage instanceof File) {
        formData.append("templateImage", eventData.templateImage);
      }

      const headers = { "Content-Type": "multipart/form-data" };
      if (idempotencyKey) {
        headers["Idempotency-Key"] = idempotencyKey;
      }

      return apiRequest({
        method: "POST",
        path: API_PATHS.events.createEvent,
        data: formData,
        config: { headers },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.myEvents() });
      queryClient.invalidateQueries({ queryKey: eventsKeys.stats() });
      queryClient.invalidateQueries({ queryKey: eventsKeys.subscriptionInfo() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.host() });
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
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  },

  // Bulk Delete Events
  bulkDeleteEvents: {
    mutationFn: (eventIds) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.events.bulkDeleteEvents,
        data: toBulkIdsPayload(eventIds),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
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
