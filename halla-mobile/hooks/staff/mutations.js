import { useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL, ENDPOINTS } from "../../config/api";
import { fetchWithTimeout } from "../../services/http";
import { saveStaffToken } from "../../services/secureStorage";
import { eventsKeys } from "../events/keys";
import { eventsRequest } from "../events/queries";
import { staffFetch } from "./queries";
import { staffKeys } from "./keys";

const _buildVerifyError = (response, data) => {
  const err = new Error(data?.message || `Request failed (${response.status})`);
  err.status = response.status;
  err.reason = data?.reason || null;
  return err;
};

const _verify = async (queryString) => {
  const url = `${API_BASE_URL}${ENDPOINTS.STAFF.VERIFY}?${queryString}`;
  const response = await fetchWithTimeout(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw _buildVerifyError(response, data);
  if (data?.data?.sessionToken) {
    await saveStaffToken(data.data.sessionToken);
  }
  return data?.data;
};

/**
 * Verify staff access via phone+eventId (or token, when supported).
 */
export function useVerifyStaffAccess() {
  return useMutation({
    mutationFn: async ({ phone, eventId, token }) => {
      if (token) return _verify(`token=${encodeURIComponent(token)}`);
      return _verify(
        `phone=${encodeURIComponent(phone)}&eventId=${encodeURIComponent(eventId)}`,
      );
    },
  });
}

/**
 * Check in a guest. Accepts exactly one of `qrCode`, `guestId`, or `phone`.
 * Invalidates the staff guest list on success.
 */
export function useCheckInGuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, qrCode, guestId, phone }) => {
      const body = qrCode
        ? { qrCode }
        : guestId
          ? { guestId }
          : { phone };
      const data = await staffFetch(ENDPOINTS.STAFF.CHECK_IN(eventId), {
        method: "POST",
        body: JSON.stringify(body),
      });
      return data?.data;
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: staffKeys.guestsForEvent(eventId) });
    },
  });
}

/**
 * Revoke a staff member's access tokens. Idempotent. `staffId` is the
 * event.staffList sub-document _id (backend resolves the token from the
 * staff phone). Per-call idempotency key protects against double-tap.
 */
const _revokeStaffAccess = async (eventId, staffId) => {
  if (!eventId || !staffId) {
    throw new Error("eventId and staffId are required");
  }
  const idempotencyKey = `staff-revoke-${eventId}-${staffId}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  const res = await eventsRequest(ENDPOINTS.EVENTS.REVOKE_STAFF(eventId, staffId), {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
  });
  return res?.data || res;
};

/**
 * Revoke a staff member's access tokens (host-facing).
 */
export function useRevokeStaffAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, staffId }) => {
      return _revokeStaffAccess(eventId, staffId);
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.staffTokens(eventId) });
    },
  });
}
