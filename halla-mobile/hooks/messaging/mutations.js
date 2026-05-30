import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  sendTestInvitation,
  sendBulkInvitations,
  retryFailedInvitations,
  sendReminder,
} from "../../services/messagingService";
import { ENDPOINTS } from "../../config/api";
import { apiFetch } from "../../services/http";
import { dashboardKeys } from "../dashboard/keys";
import { eventsKeys } from "../events/keys";

const invalidateEventCaches = (queryClient, eventId) => {
  queryClient.invalidateQueries({ queryKey: eventsKeys.singleStats(eventId) });
  queryClient.invalidateQueries({ queryKey: dashboardKeys.host() });
  queryClient.invalidateQueries({ queryKey: eventsKeys.all });
};

/**
 * Send a test message for an event. Calls PATCH /events/:eventId/test-message
 * via `sendTestInvitation`.
 */
export function useSendTestMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, phoneNumber, channel }) => {
      return await sendTestInvitation(phoneNumber, eventId, channel);
    },
    onSuccess: (data, variables) => {
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
    onSuccess: (data, variables) => {
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
    mutationFn: async ({ guestIds, eventId, channel }) => {
      return await sendBulkInvitations(guestIds, eventId, channel);
    },
    onSuccess: (data, variables) => {
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
    mutationFn: async ({ eventId, channel }) => {
      return await retryFailedInvitations(eventId, channel);
    },
    onSuccess: (data, variables) => {
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
    mutationFn: async ({ eventId, channel, customMessage }) => {
      return await sendReminder(eventId, channel, customMessage);
    },
    onSuccess: (data, variables) => {
      invalidateEventCaches(queryClient, variables.eventId);
    },
  });
}
