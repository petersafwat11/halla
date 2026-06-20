"use client";

// Canonical react-query hooks for the messaging module.
//
// Each mutation invalidates the messaging stats key plus the owning
// event and host dashboard, mirroring the pattern in
// `useEventSettingsMutation`. Mutations also send a per-call
// `Idempotency-Key` so a fast double-click is deduped at the
// idempotency middleware layer (the underlying operations are naturally
// idempotent on the server, but the header lets the middleware replay
// the cached response instead of double-spending an SMS credit).

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";
import { messagingKeys } from "./keys";
import { eventsKeys } from "@/hooks/events/keys";
import { dashboardKeys } from "@/hooks/dashboard/keys";

// Mint a UUID v4 with a degraded fallback for environments that lack
// `crypto.randomUUID` (older browsers, jsdom).
const newIdempotencyKey = (prefix) => {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${id}`;
};

const useMessagingInvalidations = () => {
  const queryClient = useQueryClient();
  return (eventId) => {
    if (eventId) {
      queryClient.invalidateQueries({ queryKey: messagingKeys.stats(eventId) });
      queryClient.invalidateQueries({ queryKey: eventsKeys.detail(eventId) });
    }
    queryClient.invalidateQueries({ queryKey: dashboardKeys.host() });
  };
};

/**
 * Send invitation to a single guest.
 * Body: `{ guestId, eventId, channel }`.
 */
export const useSendInvitation = () => {
  const invalidate = useMessagingInvalidations();
  return useMutation({
    mutationFn: ({ guestId, eventId, channel }) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.invitations.send,
        data: { guestId, eventId, channel },
        config: {
          headers: {
            "Idempotency-Key": newIdempotencyKey(`send-${eventId}`),
          },
        },
      }),
    onSuccess: (_, { eventId }) => invalidate(eventId),
  });
};

/**
 * Send invitations to a batch of guests.
 * Body: `{ guestIds, eventId, channel }`.
 */
export const useSendBulkInvitations = () => {
  const invalidate = useMessagingInvalidations();
  return useMutation({
    mutationFn: ({ guestIds, eventId, channel }) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.invitations.sendBulk,
        data: { guestIds, eventId, channel },
        config: {
          headers: {
            "Idempotency-Key": newIdempotencyKey(`send-bulk-${eventId}`),
          },
        },
      }),
    onSuccess: (_, { eventId }) => invalidate(eventId),
  });
};

/**
 * Retry failed invitations for an event.
 * Body: `{ eventId, channel }`.
 */
export const useRetryFailedInvitations = () => {
  const invalidate = useMessagingInvalidations();
  return useMutation({
    mutationFn: ({ eventId, channel }) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.invitations.retry,
        data: { eventId, channel },
        config: {
          headers: {
            "Idempotency-Key": newIdempotencyKey(`retry-${eventId}`),
          },
        },
      }),
    onSuccess: (_, { eventId }) => invalidate(eventId),
  });
};

/**
 * Send reminder to pending guests.
 * Body: `{ eventId, channel, customMessage?, guestIds?, reminderTemplateName? }`.
 */
export const useSendReminder = () => {
  const invalidate = useMessagingInvalidations();
  return useMutation({
    mutationFn: ({
      eventId,
      channel,
      customMessage,
      guestIds,
      reminderTemplateName,
    }) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.invitations.sendReminder,
        data: {
          eventId,
          channel,
          ...(customMessage ? { customMessage } : {}),
          ...(guestIds ? { guestIds } : {}),
          ...(reminderTemplateName ? { reminderTemplateName } : {}),
        },
        config: {
          headers: {
            "Idempotency-Key": newIdempotencyKey(`reminder-${eventId}`),
          },
        },
      }),
    onSuccess: (_, { eventId }) => invalidate(eventId),
  });
};

/**
 * Schedule a bulk send.
 * Body: `{ eventId, scheduledDate, scheduledTime }`.
 */
export const useScheduleSend = () => {
  const invalidate = useMessagingInvalidations();
  return useMutation({
    mutationFn: ({ eventId, scheduledDate, scheduledTime }) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.invitations.schedule,
        data: { eventId, scheduledDate, scheduledTime },
        config: {
          headers: {
            "Idempotency-Key": newIdempotencyKey(`schedule-${eventId}`),
          },
        },
      }),
    onSuccess: (_, { eventId }) => invalidate(eventId),
  });
};

/**
 * Send a test message — uses the canonical events endpoint
 * `PATCH /events/:id/test-message`. Callers pass `eventId` alongside
 * the body so they don't need to compose the path themselves.
 */
export const useSendTestMessage = () => {
  const invalidate = useMessagingInvalidations();
  return useMutation({
    mutationFn: ({ eventId, phoneNumber }) =>
      apiRequest({
        method: "PATCH",
        path: API_PATHS.events.sendTestMessage(eventId),
        data: { phoneNumber },
        config: {
          headers: {
            "Idempotency-Key": newIdempotencyKey(`test-${eventId}`),
          },
        },
      }),
    onSuccess: (_, { eventId }) => invalidate(eventId),
  });
};
