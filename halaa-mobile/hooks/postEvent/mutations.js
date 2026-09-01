import { useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL, ENDPOINTS } from "../../config/api";
import { apiFetch } from "../../services/http";
import { postEventKeys } from "./keys";
import {
  hostPostEventRequest,
  postEventGuestRequest,
  postEventWithSession,
} from "./queries";

export const createPostEventAttemptId = (prefix = "post-event") => {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid
    ? `${prefix}-${uuid}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

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
    mutationFn: async ({ eventId, postId, formData, sessionToken }) => {
      // UGC gate (§6): record the guest's Community-Rules acceptance first.
      await postEventGuestRequest(
        `${API_BASE_URL}/post-event/${eventId}/policies/accept`,
        {
          method: "POST",
          headers: postEventWithSession(sessionToken),
          body: JSON.stringify({}),
        },
        "Failed to accept policies",
      );
      return postEventGuestRequest(
        `${API_BASE_URL}${ENDPOINTS.POST_EVENT.ADD_COMMENT(eventId, postId)}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${sessionToken}` },
          body: formData,
        },
        "Failed to add comment",
      );
    },
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
    mutationFn: async ({ eventId, formData }) => {
      // UGC gate (§6): host accepts current Terms/Community Rules before
      // uploading public media (backend requires it).
      await apiFetch(ENDPOINTS.MODERATION.ACCEPT, { method: "POST", body: {} });
      return hostPostEventRequest(ENDPOINTS.POST_EVENT.UPLOAD_MEDIA(eventId), {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: (_data, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: postEventKeys.hostContent(eventId) });
    },
  });
}

/**
 * Report post-event UGC (comment/media). Params: { eventId, sessionToken,
 * targetType, targetId, reportedActorType?, reportedActorId?, reason, details? }.
 */
export function useReportPostEventContent() {
  return useMutation({
    mutationFn: ({ eventId, sessionToken, ...body }) =>
      postEventGuestRequest(
        `${API_BASE_URL}/post-event/${eventId}/report`,
        {
          method: "POST",
          headers: postEventWithSession(sessionToken),
          body: JSON.stringify(body),
        },
        "Failed to submit report",
      ),
  });
}

/**
 * Block a UGC author (guest). Their content disappears from the blocker's view
 * on next fetch. Params: { eventId, postId, sessionToken, blockedActorType,
 * blockedActorId }.
 */
export function useBlockPostEventActor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, sessionToken, blockedActorType, blockedActorId }) =>
      postEventGuestRequest(
        `${API_BASE_URL}/post-event/${eventId}/block`,
        {
          method: "POST",
          headers: postEventWithSession(sessionToken),
          body: JSON.stringify({ blockedActorType, blockedActorId }),
        },
        "Failed to block",
      ),
    onSuccess: (_data, { eventId, postId }) => {
      queryClient.invalidateQueries({
        queryKey: postEventKeys.commentsForPost(eventId, postId),
      });
      queryClient.invalidateQueries({ queryKey: postEventKeys.content(eventId) });
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
    mutationFn: ({
      eventId,
      body = { filter: "attended" },
      attemptId = createPostEventAttemptId("publish-notify"),
    }) =>
      hostPostEventRequest(ENDPOINTS.POST_EVENT.PUBLISH_AND_NOTIFY(eventId), {
        method: "POST",
        headers: { "Idempotency-Key": attemptId },
        body: { ...body, attemptId },
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
    mutationFn: ({
      eventId,
      body,
      attemptId = createPostEventAttemptId("access-links"),
    }) =>
      hostPostEventRequest(ENDPOINTS.POST_EVENT.SEND_ACCESS_LINKS(eventId), {
        method: "POST",
        headers: { "Idempotency-Key": attemptId },
        body: { ...body, attemptId },
      }),
  });
}
