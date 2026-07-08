import { useQuery } from "@tanstack/react-query";
import { ENDPOINTS } from "../../config/api";
import { apiFetch } from "../../services/http";
import { guestPortalKeys } from "./keys";

/**
 * Public portal queries.
 *
 * The invitation portal must work for unauthenticated users — the
 * invitation code itself is the authorization. We pipe through the
 * existing `apiFetch` with `skipAuth: true` so the helper omits the
 * Authorization header and never triggers a token-refresh round-trip.
 */
const _publicGet = async (path, errorMessage) => {
  const response = await apiFetch(path, { method: "GET", skipAuth: true });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.message || errorMessage);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
};

/**
 * GET /guests/invitation/:code — public lookup for the invitation
 * portal screen. Returns `{ guest, event }`.
 */
export function useGuestByToken(code) {
  return useQuery({
    queryKey: guestPortalKeys.byInvitation(code),
    queryFn: () => _publicGet(ENDPOINTS.GUESTS.INVITATION(code), "Invalid invitation"),
    enabled: !!code,
    staleTime: 60 * 1000,
    retry: (failureCount, error) => {
      // 404 / 410 are terminal; do not retry.
      const status = error?.status;
      if (status === 404 || status === 410 || status === 400) return false;
      return failureCount < 2;
    },
  });
}

export default useGuestByToken;
