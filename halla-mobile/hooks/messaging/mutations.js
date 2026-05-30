import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ENDPOINTS } from "../../config/api";
import { apiFetch } from "../../services/http";
import { dashboardKeys } from "../dashboard/keys";
import { eventsKeys } from "../events/keys";

const INVITATIONS_BASE = "/messaging";

/**
 * Internal messaging API helper. Routes through `apiFetch` so 401s
 * auto-refresh the access token.
 */
const _messagingRequest = async (suffix, options = {}) => {
  const path = `${INVITATIONS_BASE}${suffix}`;
  const fetchOpts = {
    method: options.method || "GET",
    headers: options.headers || {},
  };
  if (options.body !== undefined && options.body !== null) {
    fetchOpts.body =
      typeof options.body === "string"
        ? JSON.parse(options.body)
        : options.body;
  }
  const response = await apiFetch(path, fetchOpts);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "API request failed");
  return data;
};

const invalidateEventCaches = (queryClient, eventId) => {
  queryClient.invalidateQueries({ queryKey: eventsKeys.singleStats(eventId) });
  queryClient.invalidateQueries({ queryKey: dashboardKeys.host() });
  queryClient.invalidateQueries({ queryKey: eventsKeys.all });
};

/**
 * Send a test message for an event. Hits PATCH /events/:eventId/test-message
 * (the canonical events route, not the /messaging mount).
 */
export function useSendTestMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, phoneNumber, channel }) => {
      const response = await apiFetch(ENDPOINTS.EVENTS.TEST_MESSAGE(eventId), {
        method: "PATCH",
        body: { phoneNumber, channel },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "API request failed");
      return data;
    },
    onSuccess: (_data, variables) => {
      invalidateEventCaches(queryClient, variables.eventId);
    },
  });
}

/**
 * Schedule message sending for an event. Calls POST /messaging/schedule.
 */
export function useScheduleSend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, scheduledDate, scheduledTime, channel }) => {
      const response = await apiFetch(ENDPOINTS.MESSAGING.SCHEDULE, {
        method: "POST",
        body: { eventId, scheduledDate, scheduledTime, channel },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Failed to schedule message");
      return data;
    },
    onSuccess: (_data, variables) => {
      invalidateEventCaches(queryClient, variables.eventId);
    },
  });
}

/**
 * Send bulk invitations to selected guests. Calls POST /messaging/send-bulk.
 */
export function useSendBulkInvitations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ guestIds, eventId, channel = "sms" }) =>
      _messagingRequest("/send-bulk", {
        method: "POST",
        body: { guestIds, eventId, channel },
      }),
    onSuccess: (_data, variables) => {
      invalidateEventCaches(queryClient, variables.eventId);
    },
  });
}

/**
 * Retry failed invitations for an event. Calls POST /messaging/retry.
 */
export function useRetryFailed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, channel = "sms" }) =>
      _messagingRequest("/retry", {
        method: "POST",
        body: { eventId, channel },
      }),
    onSuccess: (_data, variables) => {
      invalidateEventCaches(queryClient, variables.eventId);
    },
  });
}

/**
 * Send a reminder to pending guests. Calls POST /messaging/send-reminder.
 */
export function useSendReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, channel = "sms", customMessage }) => {
      const body = { eventId, channel };
      if (customMessage) body.customMessage = customMessage;
      return _messagingRequest("/send-reminder", { method: "POST", body });
    },
    onSuccess: (_data, variables) => {
      invalidateEventCaches(queryClient, variables.eventId);
    },
  });
}
