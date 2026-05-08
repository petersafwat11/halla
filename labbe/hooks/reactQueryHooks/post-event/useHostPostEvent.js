"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

const hostContentKey = (eventId) => ["post-event", "host", eventId];

const invalidateHostContent = (queryClient, eventId) => {
  queryClient.invalidateQueries({ queryKey: hostContentKey(eventId) });
};

/**
 * Host management view of post-event content (event + media + thank-you +
 * messaging template + publish state).
 */
export const useHostPostEventContent = (eventId, options = {}) =>
  useQuery({
    queryKey: hostContentKey(eventId),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.postEvent.getHostContent(eventId),
      }),
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });

/**
 * Mixed photos+videos in a single multipart batch (max 20 files).
 * `data` is a `FormData` with `files` field entries (matches backend
 * `uploadMedia.array("files", 20)`).
 */
export const useUploadPostEventMedia = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, formData }) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.postEvent.uploadMedia(eventId),
        data: formData,
        config: { headers: { "Content-Type": "multipart/form-data" } },
      }),
    onSuccess: (_, { eventId }) => invalidateHostContent(queryClient, eventId),
  });
};

export const useDeletePostEventMedia = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, mediaId }) =>
      apiRequest({
        method: "DELETE",
        path: API_PATHS.postEvent.deleteMedia(eventId, mediaId),
      }),
    onSuccess: (_, { eventId }) => invalidateHostContent(queryClient, eventId),
  });
};

/**
 * Update thank-you message. Body accepts any of `text`, `textAr`,
 * `description`, `descriptionAr` (at least one required by backend).
 */
export const useUpdateThankYouMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, data }) =>
      apiRequest({
        method: "PATCH",
        path: API_PATHS.postEvent.updateThankYouMessage(eventId),
        data,
      }),
    onSuccess: (_, { eventId }) => invalidateHostContent(queryClient, eventId),
  });
};

/**
 * Save the chosen Taqnyat WhatsApp template for access-link dispatch.
 * Body: `{ taqnyatTemplateRef: ObjectId }`.
 */
export const useUpdatePostEventMessagingTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, taqnyatTemplateRef }) =>
      apiRequest({
        method: "PATCH",
        path: API_PATHS.postEvent.updateMessagingTemplate(eventId),
        data: { taqnyatTemplateRef },
      }),
    onSuccess: (_, { eventId }) => invalidateHostContent(queryClient, eventId),
  });
};

export const usePublishPostEventContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId }) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.postEvent.publishContent(eventId),
      }),
    onSuccess: (_, { eventId }) => invalidateHostContent(queryClient, eventId),
  });
};

export const useUnpublishPostEventContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId }) =>
      apiRequest({
        method: "PATCH",
        path: API_PATHS.postEvent.unpublishContent(eventId),
      }),
    onSuccess: (_, { eventId }) => invalidateHostContent(queryClient, eventId),
  });
};

/**
 * Generate guest access tokens. Body: `{ guestIds?, filter? }` — exactly
 * one of the two is required by backend Zod schema.
 */
export const useGeneratePostEventTokens = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, data }) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.postEvent.generateBulkTokens(eventId),
        data,
      }),
    onSuccess: (_, { eventId }) => invalidateHostContent(queryClient, eventId),
  });
};

/**
 * Send WhatsApp/SMS access links via Taqnyat. Body:
 * `{ guestIds?, filter?, taqnyatTemplateRef? }` — `taqnyatTemplateRef` is
 * optional (defaults to the saved template). When neither resolves, backend
 * returns 400 with `error.response.data.reason === 'no_template'`.
 */
export const useSendPostEventAccessLinks = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, data }) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.postEvent.sendBulkAccessLinks(eventId),
        data,
      }),
    onSuccess: (_, { eventId }) => invalidateHostContent(queryClient, eventId),
  });
};
