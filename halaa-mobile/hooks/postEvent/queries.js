/**
 * Guest-side + host-side post-event query hooks. Hook surface mirrors web
 * for cross-platform parity.
 */

import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL, ENDPOINTS } from "../../config/api";
import { apiFetch, fetchWithTimeout } from "../../services/http";
import { useAuthStore } from "../../stores/authStore";
import { postEventKeys } from "./keys";

/**
 * Guest-side requests authenticate with a per-event guest session token
 * (NOT the host's user JWT). A 401 here means the guest session expired
 * and the guest needs to re-validate the link — it should not trigger
 * the user-token refresh flow, so we use `fetchWithTimeout` directly.
 */
const _guestRequest = async (url, init, errorMessage) => {
  const response = await fetchWithTimeout(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.message || errorMessage);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
};

const _withSession = (sessionToken) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${sessionToken}`,
});

export { _guestRequest as postEventGuestRequest, _withSession as postEventWithSession };

/**
 * Host-side post-event helper — uses `apiFetch` so the in-memory access
 * token + 401 refresh + 30s timeout (60s for multipart) are inherited.
 */
export const hostPostEventRequest = async (path, options = {}) => {
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const response = await apiFetch(path, {
    method: options.method || "GET",
    body: options.body,
    headers: options.headers,
    timeoutMs: isFormData ? 60 * 1000 : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.message || "Request failed");
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
};

export function useValidatePostEventToken(token, opts = {}) {
  return useQuery({
    queryKey: postEventKeys.validate(token),
    queryFn: () =>
      _guestRequest(
        `${API_BASE_URL}${ENDPOINTS.POST_EVENT.VALIDATE_TOKEN}?token=${encodeURIComponent(token)}`,
        { method: "GET", headers: { "Content-Type": "application/json" } },
        "Invalid or expired token",
      ),
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
    queryFn: () =>
      _guestRequest(
        `${API_BASE_URL}${ENDPOINTS.POST_EVENT.CONTENT(eventId)}`,
        { method: "GET", headers: _withSession(sessionToken) },
        "Failed to load content",
      ),
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
  opts = {},
) {
  return useQuery({
    queryKey: postEventKeys.comments(eventId, postId, params),
    queryFn: () => {
      const { page = 1, limit = 20 } = params || {};
      return _guestRequest(
        `${API_BASE_URL}${ENDPOINTS.POST_EVENT.GET_COMMENTS(eventId, postId)}?page=${page}&limit=${limit}`,
        { method: "GET", headers: _withSession(sessionToken) },
        "Failed to load comments",
      );
    },
    enabled: !!eventId && !!postId && !!sessionToken,
    staleTime: 30 * 1000,
    ...opts,
  });
}

export function useHostPostEventContent(eventId, opts = {}) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: postEventKeys.hostContent(eventId),
    queryFn: () => hostPostEventRequest(ENDPOINTS.POST_EVENT.HOST_CONTENT(eventId)),
    enabled: !!token && !!eventId,
    staleTime: 30 * 1000,
    ...opts,
  });
}
