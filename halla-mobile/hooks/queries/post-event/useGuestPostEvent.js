/**
 * Guest-side post-event hooks.
 *
 * The guest session token is dynamic per-validate and is not stored in
 * the auth store. Hooks accept `sessionToken` explicitly; the screen
 * holds it in local state, populated from `useValidatePostEventToken`.
 *
 * Hook surface mirrors the web `useGuestPostEvent.js` name-for-name so
 * cross-platform parity stays mechanical.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addPostEventComment,
  getPostEventComments,
  getPostEventContent,
  togglePostEventLike,
  validatePostEventToken,
} from "../../../services/postEventService";

const contentKey = (eventId) => ["post-event", "content", eventId];
const commentsKey = (eventId, postId, params) => [
  "post-event",
  "comments",
  eventId,
  postId,
  params || {},
];

export function useValidatePostEventToken(token, opts = {}) {
  return useQuery({
    queryKey: ["post-event", "validate", token],
    queryFn: () => validatePostEventToken(token),
    enabled: !!token,
    retry: (failureCount, error) => {
      const status = error?.status;
      // 4xx + 410 are terminal — never retry.
      if (status === 410 || status === 404 || status === 400 || status === 401) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 60 * 1000,
    ...opts,
  });
}

export function usePostEventContent(eventId, sessionToken, opts = {}) {
  return useQuery({
    queryKey: contentKey(eventId),
    queryFn: () => getPostEventContent(eventId, sessionToken),
    enabled: !!eventId && !!sessionToken,
    staleTime: 30 * 1000,
    ...opts,
  });
}

export function usePostEventComments(
  eventId,
  postId,
  params,
  sessionToken,
  opts = {}
) {
  return useQuery({
    queryKey: commentsKey(eventId, postId, params),
    queryFn: () =>
      getPostEventComments(eventId, postId, params, sessionToken),
    enabled: !!eventId && !!postId && !!sessionToken,
    staleTime: 30 * 1000,
    ...opts,
  });
}

/**
 * Optimistic toggle-like mutation. Snapshots `["post-event","content"]`,
 * mutates the matching media item's `userLiked` + `likesCount`, then
 * rolls back on error. The success path also patches in the canonical
 * counts returned by the backend so the client and server stay in sync
 * without a full refetch.
 */
export function useTogglePostEventLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, postId, sessionToken }) =>
      togglePostEventLike(eventId, postId, sessionToken),
    onMutate: async ({ eventId, postId }) => {
      const key = contentKey(eventId);
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
        queryClient.setQueryData(contentKey(eventId), ctx.previous);
      }
    },
    onSuccess: (response, { eventId, postId }) => {
      const result = response?.data || {};
      const liked = result.liked;
      const likesCount = result.likesCount;
      if (liked === undefined || likesCount === undefined) return;
      queryClient.setQueryData(contentKey(eventId), (current) => {
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
      addPostEventComment(eventId, postId, formData, sessionToken),
    onSuccess: (_data, { eventId, postId }) => {
      // Invalidate every paginated comments page for this post.
      queryClient.invalidateQueries({
        queryKey: ["post-event", "comments", eventId, postId],
      });
      // Comment counts live on the parent content too.
      queryClient.invalidateQueries({ queryKey: contentKey(eventId) });
    },
  });
}
