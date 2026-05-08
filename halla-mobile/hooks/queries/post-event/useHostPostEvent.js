/**
 * Host-side post-event hooks.
 *
 * Mirrors the web `useHostPostEvent.js` name-for-name so the two
 * platforms expose an identical surface for tests and code review.
 * Auth is handled inside `apiFetch` (token attach + 401 refresh) — the
 * hooks themselves do not see the user JWT.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../stores/authStore";
import {
  deletePostEventMedia,
  generatePostEventTokens,
  getHostPostEventContent,
  publishPostEventContent,
  sendPostEventAccessLinks,
  unpublishPostEventContent,
  updatePostEventMessagingTemplate,
  updateThankYouMessage,
  uploadPostEventMedia,
} from "../../../services/hostPostEventService";

const hostContentKey = (eventId) => ["post-event", "host", "content", eventId];

export function useHostPostEventContent(eventId, opts = {}) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: hostContentKey(eventId),
    queryFn: () => getHostPostEventContent(eventId),
    enabled: !!token && !!eventId,
    staleTime: 30 * 1000,
    ...opts,
  });
}

export function useUploadPostEventMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, formData }) =>
      uploadPostEventMedia(eventId, formData),
    onSuccess: (_data, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: hostContentKey(eventId) });
    },
  });
}

export function useDeletePostEventMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, mediaId }) =>
      deletePostEventMedia(eventId, mediaId),
    onSuccess: (_data, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: hostContentKey(eventId) });
    },
  });
}

export function useUpdateThankYouMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, body }) => updateThankYouMessage(eventId, body),
    onSuccess: (_data, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: hostContentKey(eventId) });
    },
  });
}

export function useUpdatePostEventMessagingTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, body }) =>
      updatePostEventMessagingTemplate(eventId, body),
    onSuccess: (_data, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: hostContentKey(eventId) });
    },
  });
}

export function usePublishPostEventContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId }) => publishPostEventContent(eventId),
    onSuccess: (_data, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: hostContentKey(eventId) });
    },
  });
}

export function useUnpublishPostEventContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId }) => unpublishPostEventContent(eventId),
    onSuccess: (_data, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: hostContentKey(eventId) });
    },
  });
}

export function useGeneratePostEventTokens() {
  return useMutation({
    mutationFn: ({ eventId, body }) => generatePostEventTokens(eventId, body),
  });
}

export function useSendPostEventAccessLinks() {
  return useMutation({
    mutationFn: ({ eventId, body }) => sendPostEventAccessLinks(eventId, body),
  });
}
