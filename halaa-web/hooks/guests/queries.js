"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";
import { guestsKeys } from "./keys";

/**
 * Fetch a guest record by their public invitation code (guest portal).
 */
export const useGuestByToken = (token, options = {}) => {
  return useQuery({
    queryKey: guestsKeys.byToken(token),
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
 * Guest book — the host's reusable past guests across all their events,
 * deduped by phone, with the distinct category list. Powers the
 * "Add from your guests" picker and the manual-add category combobox.
 *
 * Returns the API envelope; read `data.data.contacts`, `data.data.categories`,
 * `data.data.pagination`.
 */
export const useMyContacts = (params = {}, options = {}) => {
  return useQuery({
    queryKey: guestsKeys.myContacts(params),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.guests.getMyContacts(),
        params,
      }),
    staleTime: 60 * 1000,
    ...options,
  });
};

/**
 * Alias of `useGuestByToken` kept for callers that read it as the
 * invitation-details query.
 */
export const useGuestInvitation = (invitationToken, options = {}) => {
  return useQuery({
    queryKey: guestsKeys.byInvitation(invitationToken),
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
