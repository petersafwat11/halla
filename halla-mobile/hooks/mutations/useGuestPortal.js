import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ENDPOINTS } from "../../config/api";
import { apiFetch } from "../../services/apiClient";

/**
 * POST /guests/:id/rsvp — public RSVP submission.
 *
 * Routed through `apiFetch` with `skipAuth: true` so the Authorization
 * header is omitted; the invitation code in the body is the proof of
 * identity for the backend route guard. The backend wraps the call in
 * `idempotency` middleware so a double-tap is treated as a replay.
 */
export function useSubmitRSVP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ guestId, response, invitationCode, message, dietaryRestrictions, plusOnes }) => {
      if (!guestId) throw new Error("guestId is required");
      const body = {
        response,
        invitationCode,
        ...(message != null ? { message } : {}),
        ...(dietaryRestrictions != null ? { dietaryRestrictions } : {}),
        ...(plusOnes != null ? { plusOnes } : {}),
      };
      const idempotencyKey = `rsvp-${guestId}-${response}-${invitationCode}`;
      const res = await apiFetch(ENDPOINTS.GUESTS.RSVP(guestId), {
        method: "POST",
        body,
        skipAuth: true,
        headers: { "Idempotency-Key": idempotencyKey },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // 409/410 from the idempotency layer indicate a replay — surface
        // the existing recorded response as a "success" outcome so the
        // screen lands on the welcome / thank-you state instead of an
        // error banner.
        if (res.status === 409 || res.status === 410) {
          return { ...data, replay: true, status: res.status };
        }
        const err = new Error(data.message || "Failed to submit RSVP");
        err.status = res.status;
        err.data = data;
        throw err;
      }
      return data;
    },
    onSuccess: (_data, variables) => {
      if (variables?.invitationCode) {
        queryClient.invalidateQueries({
          queryKey: ["guests", "invitation", variables.invitationCode],
        });
      }
    },
  });
}

export default useSubmitRSVP;
