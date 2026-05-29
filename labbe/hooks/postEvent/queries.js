"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
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
 * Paginated comments on a single post (media item).
 */
export const usePostEventComments = (
  { eventId, postId, page = 1, limit = 20 } = {},
  options = {}
) =>
  useQuery({
    queryKey: postEventKeys.comments(eventId, postId, page, limit),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.postEvent.getComments(eventId, postId),
        params: { page, limit },
      }),
    enabled: !!eventId && !!postId,
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
