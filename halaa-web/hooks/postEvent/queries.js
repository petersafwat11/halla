"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";
import { postEventKeys } from "./keys";

/**
 * Validate a guest access token (public, rate-limited).
 * Backend bubbles `body.reason` for 410-Gone (rotated/revoked/expired).
 */
export const useValidatePostEventToken = (token, options = {}) =>
  useQuery({
    queryKey: postEventKeys.validate(token),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: `${API_PATHS.postEvent.validateToken}?token=${encodeURIComponent(token || "")}`,
      }),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    retry: false,
    ...options,
  });

/**
 * Fetch published post-event content for a guest.
 */
export const usePostEventContent = (eventId, options = {}) =>
  useQuery({
    queryKey: postEventKeys.content(eventId),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.postEvent.getContent(eventId),
      }),
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });

/**
 * Paginated comments on the post (one post per event).
 */
export const usePostEventComments = (
  { eventId, page = 1, limit = 20 } = {},
  options = {}
) =>
  useQuery({
    queryKey: postEventKeys.comments(eventId, page, limit),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.postEvent.getPostComments(eventId),
        params: { page, limit },
      }),
    enabled: !!eventId,
    staleTime: 30 * 1000,
    ...options,
  });

/**
 * Host management view of post-event content (event + media + thank-you +
 * messaging template + publish state).
 */
export const useHostPostEventContent = (eventId, options = {}) =>
  useQuery({
    queryKey: postEventKeys.hostContent(eventId),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.postEvent.getHostContent(eventId),
      }),
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
