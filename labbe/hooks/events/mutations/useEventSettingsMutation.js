"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { buildMutationOptions } from "./_shared";

// Action keys handled by this sub-mutation.
export const SETTINGS_ACTIONS = [
  "updateEventDetails",
  "updateEventStep2",
  "updateInvitationSettings",
  "updateLaunchSettings",
  "sendTestMessage",
  "scheduleSend",
  "retryLaunch",
  "submitTemplate",
];

const buildMutations = (queryClient) => ({
  // Update Event Details
  updateEventDetails: {
    mutationFn: ({ eventId, data }) =>
      apiRequest({
        method: "PATCH",
        path: API_PATHS.events.updateEventDetails(eventId),
        data,
      }),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["events", eventId] });
    },
  },

  // Atomic guest+staff update for the unified update wizard's step 2.
  // Replaces the parallel `Promise.all([updateGuestList, updateStaffList])`
  // dispatch with a single PATCH so a capacity-guard rejection on either
  // side leaves both fields at their pre-call values. Server accepts
  // either `supervisorsList` (web naming, what we send) or `staffList`
  // (mobile naming).
  updateEventStep2: {
    mutationFn: ({ eventId, data }) =>
      apiRequest({
        method: "PATCH",
        path: API_PATHS.events.updateEventStep2(eventId),
        data,
      }),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["guests", "events", eventId] });
    },
  },

  // Update Invitation Settings — backend expects multipart/form-data
  // (multer middleware). The controller passes req.body fields directly
  // (no JSON.parse), so each field is appended individually.
  updateInvitationSettings: {
    mutationFn: ({ eventId, data }) => {
      const formData = new FormData();
      const { templateImage, ...restSettings } = data || {};
      Object.entries(restSettings).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, typeof value === "object" ? JSON.stringify(value) : value);
        }
      });
      if (templateImage instanceof File) {
        formData.append("templateImage", templateImage);
      }
      return apiRequest({
        method: "PATCH",
        path: API_PATHS.events.updateInvitationSettings(eventId),
        data: formData,
        config: { headers: { "Content-Type": "multipart/form-data" } },
      });
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["events", eventId] });
    },
  },

  // Update Launch Settings
  updateLaunchSettings: {
    mutationFn: ({ eventId, data }) =>
      apiRequest({
        method: "PATCH",
        path: API_PATHS.events.updateLaunchSettings(eventId),
        data,
      }),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["events", eventId] });
    },
  },

  // Send Test Message (via messaging module)
  sendTestMessage: {
    mutationFn: ({ eventId, data }) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.invitations.sendTest,
        data: { eventId, ...data },
      }),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "host"] });
    },
  },

  // Schedule bulk send (via messaging module)
  scheduleSend: {
    mutationFn: ({ eventId, scheduledDate, scheduledTime, channel }) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.invitations.schedule,
        data: { eventId, scheduledDate, scheduledTime, channel },
      }),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "host"] });
    },
  },

  // Manual launch retry — for failed events. Sends a per-click
  // Idempotency-Key so a fast double-click is deduped at the middleware
  // layer instead of relying solely on the server-side eventLock. The
  // middleware caches the response for the first call and replays it for
  // the second; this is correct here because the operation is naturally
  // idempotent (the event lock + state machine ensure no double-send).
  retryLaunch: {
    mutationFn: ({ eventId }) => {
      const idempotencyKey =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? `retry-${eventId}-${crypto.randomUUID()}`
          : `retry-${eventId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      return apiRequest({
        method: "POST",
        path: API_PATHS.events.retryLaunch(eventId),
        headers: { "Idempotency-Key": idempotencyKey },
      });
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  },

  // Submit WhatsApp template for approval
  submitTemplate: {
    mutationFn: ({ eventId }) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.invitations.submitTemplate,
        data: { eventId },
      }),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "host"] });
    },
  },
});

export const useEventSettingsMutation = (action) => {
  const queryClient = useQueryClient();
  const mutationConfig = buildMutations(queryClient)[action];
  if (!mutationConfig) {
    throw new Error(`Unknown event settings action: ${action}`);
  }
  return useMutation(buildMutationOptions(mutationConfig));
};

export default useEventSettingsMutation;
