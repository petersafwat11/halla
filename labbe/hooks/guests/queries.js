"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { guestsKeys } from "./keys";

/**
 * Fetch a guest record by their public invitation code (whitelabel portal).
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
