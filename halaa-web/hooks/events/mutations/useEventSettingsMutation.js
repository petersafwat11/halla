"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";
import { buildMutationOptions } from "./_shared";

// Action keys handled by this sub-mutation.
export const SETTINGS_ACTIONS = [
  "updateEventDetails",
  "updateEventStep2",
  "updateInvitationSettings",
  "updateLaunchSettings",
  "updateReminderSettings",
  "retryLaunch",
  "resendInvite",
  "extraReminder",
  "sendNewGuests",
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

  // Update Reminder Settings
  updateReminderSettings: {
    mutationFn: ({ eventId, data }) =>
      apiRequest({
        method: "PATCH",
        path: API_PATHS.events.updateReminderSettings(eventId),
        data,
      }),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["events", eventId] });
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
        config: { headers: { "Idempotency-Key": idempotencyKey } },
      });
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  },

  // Resend invite — pool-charged, REPEATABLE, no gates. Targets the
  // non-responder audience; pass `guestIds` to scope the send to a
  // specific selection (else the backend defaults to all non-responders).
  // The server charges the host's invite pool and 402s INSUFFICIENT_INVITES
  // when the selection exceeds remaining invites.
  resendInvite: {
    mutationFn: ({ eventId, channel, guestIds }) => {
      const idempotencyKey =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? `resend-${eventId}-${crypto.randomUUID()}`
          : `resend-${eventId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      // Channel is resolved server-side (follows the event template) when the
      // caller doesn't force one — only include it when explicitly provided.
      const data = {};
      if (channel) data.channel = channel;
      if (Array.isArray(guestIds) && guestIds.length > 0) {
        data.guestIds = guestIds;
      }
      return apiRequest({
        method: "POST",
        path: API_PATHS.events.resendInvite(eventId),
        data,
        config: { headers: { "Idempotency-Key": idempotencyKey } },
      });
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["guests", "events", eventId] });
    },
  },

  // Extra reminder — pool-charged, immediate, CONFIRMED guests only, using the
  // approved `reminder_confirmed` template. Pass `guestIds` to scope the send.
  // The server 402s INSUFFICIENT_INVITES and 400s NO_REMINDER_TEMPLATE.
  extraReminder: {
    mutationFn: ({ eventId, guestIds }) => {
      const idempotencyKey =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? `extra-reminder-${eventId}-${crypto.randomUUID()}`
          : `extra-reminder-${eventId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const data = {};
      if (Array.isArray(guestIds) && guestIds.length > 0) {
        data.guestIds = guestIds;
      }
      return apiRequest({
        method: "POST",
        path: API_PATHS.events.extraReminder(eventId),
        data,
        config: { headers: { "Idempotency-Key": idempotencyKey } },
      });
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["guests", "events", eventId] });
    },
  },

  // Send to new guests — initial pool-charged send to never-sent guests
  // (added after launch). Channel is resolved server-side (follows the event
  // template). Pass `guestIds` to scope the send. The server 402s
  // INSUFFICIENT_INVITES and 403s when the event's plan has expired.
  sendNewGuests: {
    mutationFn: ({ eventId, guestIds, channel }) => {
      const idempotencyKey =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? `send-new-${eventId}-${crypto.randomUUID()}`
          : `send-new-${eventId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const data = {};
      if (channel) data.channel = channel;
      if (Array.isArray(guestIds) && guestIds.length > 0) {
        data.guestIds = guestIds;
      }
      return apiRequest({
        method: "POST",
        path: API_PATHS.events.sendNewGuests(eventId),
        data,
        config: { headers: { "Idempotency-Key": idempotencyKey } },
      });
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["guests", "events", eventId] });
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
