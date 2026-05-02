"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

// ============================================
// POST-EVENT QUERIES
// ============================================

/**
 * Hook to validate post-event access token
 * @param {string} token
 * @returns {UseQueryResult}
 */
export const useValidatePostEventToken = (token, options = {}) => {
  return useQuery({
    queryKey: ["post-event", "validate", token],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: `${API_PATHS.postEvent.validateToken}?token=${token}`,
      }),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch post-event content
 * @param {string} eventId
 * @returns {UseQueryResult}
 */
export const usePostEventContent = (eventId, options = {}) => {
  return useQuery({
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
};

/**
 * Hook to fetch post-event media
 * @param {string} eventId
 * @returns {UseQueryResult}
 */
export const usePostEventMedia = (eventId, options = {}) => {
  return useQuery({
    queryKey: ["post-event", "media", eventId],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.postEvent.getHostContent(eventId),
      }),
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch post-event comments
 * @param {string} eventId
 * @returns {UseQueryResult}
 */
export const usePostEventComments = (eventId, options = {}) => {
  return useQuery({
    queryKey: ["post-event", "comments", eventId],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.postEvent.getComments(eventId),
      }),
    enabled: !!eventId,
    staleTime: 30 * 1000,
    ...options,
  });
};

// ============================================
// POST-EVENT MUTATIONS
// ============================================

/**
 * Unified Post-Event Mutation Hook
 * @param {string} action - The post-event action to perform
 * @returns {UseMutationResult}
 */
export const usePostEventMutation = (action) => {
  const queryClient = useQueryClient();

  const mutations = {
    // Guest: Like content
    likeContent: {
      mutationFn: ({ eventId, contentId }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.postEvent.toggleLike(eventId, contentId),
        }),
      onSuccess: (_, { eventId }) => {
        queryClient.invalidateQueries({ queryKey: ["post-event", "content", eventId] });
      },
    },

    // Guest: Unlike content
    unlikeContent: {
      mutationFn: ({ eventId, contentId }) =>
        apiRequest({
          method: "DELETE",
          path: API_PATHS.postEvent.toggleLike(eventId, contentId),
        }),
      onSuccess: (_, { eventId }) => {
        queryClient.invalidateQueries({ queryKey: ["post-event", "content", eventId] });
      },
    },

    // Guest: Add comment
    addComment: {
      mutationFn: ({ eventId, contentId, data }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.postEvent.addComment(eventId, contentId),
          data,
        }),
      onSuccess: (_, { eventId }) => {
        queryClient.invalidateQueries({ queryKey: ["post-event", "comments", eventId] });
      },
    },

    // Host: Upload photos
    uploadPhotos: {
      mutationFn: ({ eventId, formData }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.postEvent.uploadPhotos(eventId),
          data: formData,
          config: {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
        }),
      onSuccess: (_, { eventId }) => {
        queryClient.invalidateQueries({ queryKey: ["post-event", "media", eventId] });
      },
    },

    // Host: Upload videos
    uploadVideos: {
      mutationFn: ({ eventId, formData }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.postEvent.uploadVideo(eventId),
          data: formData,
          config: {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
        }),
      onSuccess: (_, { eventId }) => {
        queryClient.invalidateQueries({ queryKey: ["post-event", "media", eventId] });
      },
    },

    // Host: Update thank you message
    updateThankYouMessage: {
      mutationFn: ({ eventId, data }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.postEvent.updateThankYouMessage(eventId),
          data,
        }),
      onSuccess: (_, { eventId }) => {
        queryClient.invalidateQueries({ queryKey: ["post-event", "content", eventId] });
      },
    },

    // Host: Delete photo
    deletePhoto: {
      mutationFn: ({ eventId, photoId }) =>
        apiRequest({
          method: "DELETE",
          path: API_PATHS.postEvent.deletePhoto(eventId, photoId),
        }),
      onSuccess: (_, { eventId }) => {
        queryClient.invalidateQueries({ queryKey: ["post-event", "media", eventId] });
      },
    },

    // Host: Delete video
    deleteVideo: {
      mutationFn: ({ eventId, videoId }) =>
        apiRequest({
          method: "DELETE",
          path: API_PATHS.postEvent.deleteVideo(eventId, videoId),
        }),
      onSuccess: (_, { eventId }) => {
        queryClient.invalidateQueries({ queryKey: ["post-event", "media", eventId] });
      },
    },

    // Host: Publish post-event content
    publishContent: {
      mutationFn: (eventId) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.postEvent.publishContent(eventId),
        }),
      onSuccess: (_, eventId) => {
        queryClient.invalidateQueries({ queryKey: ["post-event", "content", eventId] });
      },
    },

    // Host: Generate access tokens
    generateTokens: {
      mutationFn: ({ eventId, data }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.postEvent.generateBulkTokens(eventId),
          data,
        }),
    },

    // Host: Send email to guests
    sendEmail: {
      mutationFn: ({ eventId, data }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.postEvent.sendBulkAccessEmails(eventId),
          data,
        }),
    },
  };

  const mutationConfig = mutations[action];

  if (!mutationConfig) {
    throw new Error(`Unknown post-event action: ${action}`);
  }

  return useMutation({
    ...mutationConfig,
    onError: (error) => {
      console.error(`Post-event mutation error (${action}):`, error);
    },
  });
};
