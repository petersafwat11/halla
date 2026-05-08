"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

/**
 * Validate a guest access token (public, rate-limited).
 * Backend bubbles `body.reason` for 410-Gone (rotated/revoked/expired).
 */
export const useValidatePostEventToken = (token, options = {}) =>
  useQuery({
    queryKey: ["post-event", "validate", token],
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
    queryKey: ["post-event", "content", eventId],
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
    queryKey: ["post-event", "comments", eventId, postId, page, limit],
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
 * Single POST toggle for like/unlike (backend is POST-only).
 */
export const useTogglePostEventLike = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, postId }) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.postEvent.toggleLike(eventId, postId),
      }),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({
        queryKey: ["post-event", "content", eventId],
      });
    },
  });
};

/**
 * Add a comment to a post; supports text + optional images via FormData.
 * Caller passes `data` as a FormData (text + files[]) or as `{ text }`.
 */
export const useAddPostEventComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, postId, data }) => {
      const isFormData =
        typeof FormData !== "undefined" && data instanceof FormData;
      return apiRequest({
        method: "POST",
        path: API_PATHS.postEvent.addComment(eventId, postId),
        data,
        config: isFormData
          ? { headers: { "Content-Type": "multipart/form-data" } }
          : undefined,
      });
    },
    onSuccess: (_, { eventId, postId }) => {
      queryClient.invalidateQueries({
        queryKey: ["post-event", "comments", eventId, postId],
      });
      queryClient.invalidateQueries({
        queryKey: ["post-event", "content", eventId],
      });
    },
  });
};
