"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";
import { postEventKeys } from "./keys";

const useInvalidateHostContent = () => {
  const queryClient = useQueryClient();
  return (eventId) =>
    queryClient.invalidateQueries({ queryKey: postEventKeys.hostContent(eventId) });
};

/**
 * Single POST toggle for like/unlike on the post (one post per event;
 * backend is POST-only, eventId-only).
 */
export const useTogglePostEventLike = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId }) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.postEvent.togglePostLike(eventId),
      }),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: postEventKeys.content(eventId) });
    },
  });
};

/**
 * Add a comment to the post; supports text + optional images via FormData.
 * Caller passes `data` as a FormData (text + files[]) or as `{ text }`.
 */
export const useAddPostEventComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, data }) => {
      const isFormData =
        typeof FormData !== "undefined" && data instanceof FormData;
      return apiRequest({
        method: "POST",
        path: API_PATHS.postEvent.addPostComment(eventId),
        data,
        config: isFormData
          ? { headers: { "Content-Type": "multipart/form-data" } }
          : undefined,
      });
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({
        queryKey: postEventKeys.comments(eventId),
      });
      queryClient.invalidateQueries({ queryKey: postEventKeys.content(eventId) });
    },
  });
};

/**
 * Mixed photos+videos in a single multipart batch (max 20 files).
 * `data` is a `FormData` with `files` field entries.
 */
export const useUploadPostEventMedia = () => {
  const invalidate = useInvalidateHostContent();
  return useMutation({
    mutationFn: ({ eventId, formData }) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.postEvent.uploadMedia(eventId),
        data: formData,
        config: { headers: { "Content-Type": "multipart/form-data" } },
      }),
    onSuccess: (_, { eventId }) => invalidate(eventId),
  });
};

export const useDeletePostEventMedia = () => {
  const invalidate = useInvalidateHostContent();
  return useMutation({
    mutationFn: ({ eventId, mediaId }) =>
      apiRequest({
        method: "DELETE",
        path: API_PATHS.postEvent.deleteMedia(eventId, mediaId),
      }),
    onSuccess: (_, { eventId }) => invalidate(eventId),
  });
};

/**
 * Update thank-you message. Body accepts any of `text`, `textAr`,
 * `description`, `descriptionAr` (at least one required by backend).
 */
export const useUpdateThankYouMessage = () => {
  const invalidate = useInvalidateHostContent();
  return useMutation({
    mutationFn: ({ eventId, data }) =>
      apiRequest({
        method: "PATCH",
        path: API_PATHS.postEvent.updateThankYouMessage(eventId),
        data,
      }),
    onSuccess: (_, { eventId }) => invalidate(eventId),
  });
};

/**
 * Save the chosen Taqnyat WhatsApp template for access-link dispatch.
 * Body: `{ taqnyatTemplateRef: ObjectId }`.
 */
export const useUpdatePostEventMessagingTemplate = () => {
  const invalidate = useInvalidateHostContent();
  return useMutation({
    mutationFn: ({ eventId, taqnyatTemplateRef }) =>
      apiRequest({
        method: "PATCH",
        path: API_PATHS.postEvent.updateMessagingTemplate(eventId),
        data: { taqnyatTemplateRef },
      }),
    onSuccess: (_, { eventId }) => invalidate(eventId),
  });
};

export const usePublishPostEventContent = () => {
  const invalidate = useInvalidateHostContent();
  return useMutation({
    mutationFn: ({ eventId }) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.postEvent.publishContent(eventId),
      }),
    onSuccess: (_, { eventId }) => invalidate(eventId),
  });
};

/**
 * Combined "Publish & notify" — publishes the post and dispatches access
 * links to the chosen audience in one call. Body: `{ filter, taqnyatTemplateRef? }`.
 * On no template, backend returns 400 with `error.response.data.reason === 'no_template'`.
 */
export const usePublishAndNotify = () => {
  const invalidate = useInvalidateHostContent();
  return useMutation({
    mutationFn: ({ eventId, data }) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.postEvent.publishAndNotify(eventId),
        data,
      }),
    onSuccess: (_, { eventId }) => invalidate(eventId),
  });
};

export const useUnpublishPostEventContent = () => {
  const invalidate = useInvalidateHostContent();
  return useMutation({
    mutationFn: ({ eventId }) =>
      apiRequest({
        method: "PATCH",
        path: API_PATHS.postEvent.unpublishContent(eventId),
      }),
    onSuccess: (_, { eventId }) => invalidate(eventId),
  });
};

/**
 * Generate guest access tokens. Body: `{ guestIds?, filter? }` — exactly
 * one of the two is required by backend Zod schema.
 */
export const useGeneratePostEventTokens = () => {
  const invalidate = useInvalidateHostContent();
  return useMutation({
    mutationFn: ({ eventId, data }) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.postEvent.generateBulkTokens(eventId),
        data,
      }),
    onSuccess: (_, { eventId }) => invalidate(eventId),
  });
};

/**
 * Send WhatsApp/SMS access links via Taqnyat. Body:
 * `{ guestIds?, filter?, taqnyatTemplateRef? }` — `taqnyatTemplateRef` is
 * optional (defaults to the saved template). When neither resolves, backend
 * returns 400 with `error.response.data.reason === 'no_template'`.
 */
export const useSendPostEventAccessLinks = () => {
  const invalidate = useInvalidateHostContent();
  return useMutation({
    mutationFn: ({ eventId, data }) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.postEvent.sendBulkAccessLinks(eventId),
        data,
      }),
    onSuccess: (_, { eventId }) => invalidate(eventId),
  });
};
