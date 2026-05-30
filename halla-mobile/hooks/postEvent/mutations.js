import { useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL, ENDPOINTS } from "../../config/api";
import { postEventKeys } from "./keys";
import {
  hostPostEventRequest,
  postEventGuestRequest,
  postEventWithSession,
} from "./queries";

/**
 * Optimistic toggle-like mutation. Snapshots `post-event/content`,
 * mutates the matching media item's `userLiked` + `likesCount`, then
 * rolls back on error. The success path also patches in the canonical
 * counts returned by the backend so the client and server stay in sync
 * without a full refetch.
 */
export function useTogglePostEventLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, postId, sessionToken }) =>
      postEventGuestRequest(
        `${API_BASE_URL}${ENDPOINTS.POST_EVENT.TOGGLE_LIKE(eventId, postId)}`,
        { method: "POST", headers: postEventWithSession(sessionToken) },
        "Failed to toggle like",
      ),
    onMutate: async ({ eventId, postId }) => {
      const key = postEventKeys.content(eventId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);

      queryClient.setQueryData(key, (current) => {
        if (!current) return current;
        const root = current?.data;
        if (!root) return current;
        const media = Array.isArray(root.media) ? root.media : null;
        if (!media) return current;
        const next = media.map((item) => {
          if (item._id !== postId) return item;
          const wasLiked = !!item.userLiked;
          const delta = wasLiked ? -1 : 1;
          return {
            ...item,
            userLiked: !wasLiked,
            likesCount: Math.max(0, (item.likesCount || 0) + delta),
          };
        });
        return { ...current, data: { ...current.data, media: next } };
      });

      return { previous };
    },
    onError: (_err, { eventId }, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(postEventKeys.content(eventId), ctx.previous);
      }
    },
    onSuccess: (response, { eventId, postId }) => {
      const result = response?.data || {};
      const liked = result.liked;
      const likesCount = result.likesCount;
      if (liked === undefined || likesCount === undefined) return;
      queryClient.setQueryData(postEventKeys.content(eventId), (current) => {
        if (!current) return current;
        const root = current?.data;
        if (!root) return current;
        const media = Array.isArray(root.media) ? root.media : null;
        if (!media) return current;
        const next = media.map((item) =>
          item._id === postId ? { ...item, userLiked: liked, likesCount } : item
        );
        return { ...current, data: { ...current.data, media: next } };
      });
    },
  });
}

export function useAddPostEventComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, postId, formData, sessionToken }) =>
      postEventGuestRequest(
        `${API_BASE_URL}${ENDPOINTS.POST_EVENT.ADD_COMMENT(eventId, postId)}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${sessionToken}` },
          body: formData,
        },
        "Failed to add comment",
      ),
    onSuccess: (_data, { eventId, postId }) => {
      // Invalidate every paginated comments page for this post.
      queryClient.invalidateQueries({
        queryKey: postEventKeys.commentsForPost(eventId, postId),
      });
      // Comment counts live on the parent content too.
      queryClient.invalidateQueries({ queryKey: postEventKeys.content(eventId) });
    },
  });
}

export function useUploadPostEventMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, formData }) =>
      hostPostEventRequest(ENDPOINTS.POST_EVENT.UPLOAD_MEDIA(eventId), {
        method: "POST",
        body: formData,
      }),
    onSuccess: (_data, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: postEventKeys.hostContent(eventId) });
    },
  });
}

export function useDeletePostEventMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, mediaId }) =>
      hostPostEventRequest(ENDPOINTS.POST_EVENT.DELETE_MEDIA(eventId, mediaId), {
        method: "DELETE",
      }),
    onSuccess: (_data, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: postEventKeys.hostContent(eventId) });
    },
  });
}

export function useUpdateThankYouMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, body }) =>
      hostPostEventRequest(ENDPOINTS.POST_EVENT.UPDATE_THANK_YOU(eventId), {
        method: "PATCH",
        body,
      }),
    onSuccess: (_data, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: postEventKeys.hostContent(eventId) });
    },
  });
}

export function useUpdatePostEventMessagingTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, body }) =>
      hostPostEventRequest(
        ENDPOINTS.POST_EVENT.UPDATE_MESSAGING_TEMPLATE(eventId),
        { method: "PATCH", body },
      ),
    onSuccess: (_data, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: postEventKeys.hostContent(eventId) });
    },
  });
}

export function usePublishPostEventContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId }) =>
      hostPostEventRequest(ENDPOINTS.POST_EVENT.PUBLISH(eventId), {
        method: "POST",
      }),
    onSuccess: (_data, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: postEventKeys.hostContent(eventId) });
    },
  });
}

export function useUnpublishPostEventContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId }) =>
      hostPostEventRequest(ENDPOINTS.POST_EVENT.UNPUBLISH(eventId), {
        method: "PATCH",
      }),
    onSuccess: (_data, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: postEventKeys.hostContent(eventId) });
    },
  });
}

export function useGeneratePostEventTokens() {
  return useMutation({
    mutationFn: ({ eventId, body }) =>
      hostPostEventRequest(ENDPOINTS.POST_EVENT.GENERATE_TOKENS(eventId), {
        method: "POST",
        body,
      }),
  });
}

export function useSendPostEventAccessLinks() {
  return useMutation({
    mutationFn: ({ eventId, body }) =>
      hostPostEventRequest(ENDPOINTS.POST_EVENT.SEND_ACCESS_LINKS(eventId), {
        method: "POST",
        body,
      }),
  });
}
