"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, downloadExportFile } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

// ============================================
// GUESTS QUERIES
// ============================================

/**
 * Fetch a guest record by their public invitation code (whitelabel portal).
 */
export const useGuestByToken = (token, options = {}) => {
  return useQuery({
    queryKey: ["guests", "token", token],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.guests.getByInvitationCode(token),
      }),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Alias of `useGuestByToken` kept for callers that read it as the
 * invitation-details query.
 */
export const useGuestInvitation = (invitationToken, options = {}) => {
  return useQuery({
    queryKey: ["guests", "invitation", invitationToken],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.guests.getByInvitationCode(invitationToken),
      }),
    enabled: !!invitationToken,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

// ============================================
// GUESTS MUTATIONS
// ============================================

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
 *   - rsvp         → POST   /guests/:id/rsvp (public, whitelabel portal)
 */
export const useGuestMutation = (action) => {
  const queryClient = useQueryClient();

  const invalidateEventGuests = (eventId) => {
    if (!eventId) return;
    queryClient.invalidateQueries({ queryKey: ["guests", "events", eventId] });
    queryClient.invalidateQueries({ queryKey: ["events", eventId] });
  };

  const mutations = {
    add: {
      mutationFn: ({ eventId, data, guestData }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.guests.addGuest(eventId),
          data: data ?? guestData,
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
      mutationFn: ({ token, response, data }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.guests.submitRSVP(token),
          data: { response, ...(data || {}) },
        }),
      onSuccess: (_, { token }) => {
        queryClient.invalidateQueries({ queryKey: ["guests", "token", token] });
        queryClient.invalidateQueries({ queryKey: ["guests", "invitation", token] });
      },
    },
  };

  const mutationConfig = mutations[action];

  if (!mutationConfig) {
    throw new Error(`Unknown guest action: ${action}`);
  }

  return useMutation(mutationConfig);
};
