"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, downloadExportFile } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";
import { guestsKeys } from "./keys";
import { eventsKeys } from "@/hooks/events/keys";

/**
 * Canonical guests-module mutation factory.
 *
 * Supported actions:
 *   - add          → POST   /guests/events/:eventId
 *   - update       → PATCH  /guests/events/:eventId/guests/:guestId
 *   - delete       → DELETE /guests/events/:eventId/guests/:guestId
 *   - rotateQr     → POST   /guests/events/:eventId/guests/:guestId/rotate-qr
 *   - revokeAccess → POST   /guests/events/:eventId/guests/:guestId/revoke-access
 *   - export       → GET    /guests/events/:eventId/export (file download)
 *   - rsvp         → POST   /guests/:id/rsvp (public guest portal; :id = guest ObjectId, code in body)
 */
export const useGuestMutation = (action) => {
  const queryClient = useQueryClient();

  const invalidateEventGuests = (eventId) => {
    if (!eventId) return;
    queryClient.invalidateQueries({ queryKey: guestsKeys.forEvent(eventId) });
    queryClient.invalidateQueries({ queryKey: eventsKeys.detail(eventId) });
  };

  const mutations = {
    bulk: {
      mutationFn: ({ eventId, data, idempotencyKey }) => apiRequest({
        method: "POST", path: API_PATHS.guests.getEventGuests(eventId) + "/bulk", data,
        config: { headers: { "Idempotency-Key": idempotencyKey } },
      }),
      onSuccess: (_, { eventId }) => invalidateEventGuests(eventId),
    },
    add: {
      mutationFn: ({ eventId, data, guestData, idempotencyKey }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.guests.addGuest(eventId),
          data: data ?? guestData,
          config: idempotencyKey ? { headers: { "Idempotency-Key": idempotencyKey } } : {},
        }),
      onSuccess: (_, { eventId }) => invalidateEventGuests(eventId),
    },

    update: {
      mutationFn: ({ eventId, guestId, data }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.guests.updateGuest(eventId, guestId),
          data,
        }),
      onSuccess: (_, { eventId }) => invalidateEventGuests(eventId),
    },

    delete: {
      mutationFn: ({ eventId, guestId }) =>
        apiRequest({
          method: "DELETE",
          path: API_PATHS.guests.deleteGuest(eventId, guestId),
        }),
      onSuccess: (_, { eventId }) => invalidateEventGuests(eventId),
    },

    rotateQr: {
      mutationFn: ({ eventId, guestId }) =>
        apiRequest({
          method: "POST",
          path: `${API_PATHS.guests.updateGuest(eventId, guestId)}/rotate-qr`,
        }),
      onSuccess: (_, { eventId }) => invalidateEventGuests(eventId),
    },

    revokeAccess: {
      mutationFn: ({ eventId, guestId }) =>
        apiRequest({
          method: "POST",
          path: `${API_PATHS.guests.updateGuest(eventId, guestId)}/revoke-access`,
        }),
      onSuccess: (_, { eventId }) => invalidateEventGuests(eventId),
    },

    export: {
      mutationFn: ({ eventId, filename }) =>
        downloadExportFile({
          path: API_PATHS.guests.exportGuests(eventId),
          filename: filename || `guests-event-${eventId}.xlsx`,
        }),
    },

    rsvp: {
      // `id` is the guest's ObjectId, used for the `/guests/:id/rsvp` route
      // slot (the route runs `validateObjectId('id')`). `token` is the public
      // qrcode/invitation code — it stays in the body as `invitationCode`
      // (the route's authz proof) and is the cache-invalidation key (the
      // portal query is keyed by the code, not the ObjectId).
      mutationFn: ({ id, token, response, data }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.guests.submitRSVP(id ?? token),
          data: { response, ...(data || {}) },
        }),
      onSuccess: (_, { token, data }) => {
        const code = token ?? data?.invitationCode;
        if (!code) return;
        queryClient.invalidateQueries({ queryKey: guestsKeys.byToken(code) });
        queryClient.invalidateQueries({ queryKey: guestsKeys.byInvitation(code) });
      },
    },
  };

  const mutationConfig = mutations[action];

  if (!mutationConfig) {
    throw new Error(`Unknown guest action: ${action}`);
  }

  return useMutation(mutationConfig);
};
