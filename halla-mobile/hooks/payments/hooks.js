/**
 * 3DS-return poll hook. After the bank redirects back to the Moyasar
 * callback URL, the deep-link handler routes here with the Moyasar
 * payment id in route params. We poll `/payments/:id/poll` until the
 * payment lands in a terminal state, then surface the result so the
 * screen can route by `metadata.purpose`.
 *
 * Mirrors web `app/[lang]/host/payments/return/_components/PaymentReturnClient.jsx`
 * but exposes a hook so the mobile screen owns the rendering + routing.
 *
 * Note: not React Query — this is useEffect+useState polling because the
 * underlying call doesn't fit RQ's caching semantics (it's a single one-shot
 * lifecycle that the consumer mounts once at deep-link arrival).
 */

import { useEffect, useRef, useState } from "react";
import adminDashboardService from "../../services/adminDashboardService";

const TERMINAL = new Set([
  "paid",
  "captured",
  "failed",
  "refunded",
  "voided",
  "partially_refunded",
]);

const MAX_ATTEMPTS = 30;
const INTERVAL_MS = 2000;

/**
 * @param {string|null} moyasarId  Payment id Moyasar appended to the
 *   callback URL. Token is read from the in-memory auth store inside
 *   the service (we still pass null for the legacy positional arg).
 * @returns {{ status, payment, error }}
 */
export function usePaymentPoll(moyasarId) {
  const [status, setStatus] = useState("pending_3ds");
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState(null);
  const cancelledRef = useRef(false);
  const timerRef = useRef(null);

  useEffect(() => {
    cancelledRef.current = false;

    if (!moyasarId) {
      setError("MISSING_ID");
      return undefined;
    }

    let attempts = 0;

    const poll = async () => {
      try {
        const response = await adminDashboardService.payments.poll3ds(null, moyasarId);
        if (cancelledRef.current) return;

        if (!response.success) {
          setError(response.error || "POLL_FAILED");
          return;
        }
        // Service preserves the legacy `{ success, data, error }` envelope;
        // the actual payment is nested as `data.data` (controller wraps it
        // again via sendSuccess).
        const next = response.data?.data || response.data;
        if (!next) {
          setError("EMPTY_RESPONSE");
          return;
        }

        setPayment(next);
        setStatus(next.status);

        if (TERMINAL.has(next.status)) return;

        attempts += 1;
        if (attempts < MAX_ATTEMPTS) {
          timerRef.current = setTimeout(poll, INTERVAL_MS);
        } else {
          setError("TIMEOUT");
        }
      } catch (err) {
        if (cancelledRef.current) return;
        setError(err?.message || "POLL_FAILED");
      }
    };
    poll();

    return () => {
      cancelledRef.current = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [moyasarId]);

  return { status, payment, error };
}

export default usePaymentPoll;
