/**
 * Guest-side + host-side post-event query hooks. Hook surface mirrors web
 * for cross-platform parity.
 */

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import {
  getPostEventComments,
  getPostEventContent,
  validatePostEventToken,
} from "../../services/postEventService";
import { getHostPostEventContent } from "../../services/hostPostEventService";
import { postEventKeys } from "./keys";

export function useValidatePostEventToken(token, opts = {}) {
  return useQuery({
    queryKey: postEventKeys.validate(token),
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
    queryKey: postEventKeys.content(eventId),
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
    queryKey: postEventKeys.comments(eventId, postId, params),
    queryFn: () => getPostEventComments(eventId, postId, params, sessionToken),
    enabled: !!eventId && !!postId && !!sessionToken,
    staleTime: 30 * 1000,
    ...opts,
  });
}

export function useHostPostEventContent(eventId, opts = {}) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: postEventKeys.hostContent(eventId),
    queryFn: () => getHostPostEventContent(eventId),
    enabled: !!token && !!eventId,
    staleTime: 30 * 1000,
    ...opts,
  });
}
