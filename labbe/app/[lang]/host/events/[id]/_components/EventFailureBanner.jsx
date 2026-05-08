"use client";

/**
 * EventFailureBanner.
 *
 * Renders the "we're sorry" UI on the host event detail page when the
 * event is in `failed` status, plus a softer "we're retrying"
 * announcement when an in-flight retry is detected (status `scheduled`
 * with `attemptCount > 0`).
 *
 * The retry button shows for the host (creator), the whitelabel-admin
 * who owns the event's whitelabel, admin and super_admin. The backend
 * route enforces RBAC again — the UI gate is just to keep the button
 * out of the way for unauthorized users.
 */

import React, { useEffect, useState } from "react";
import { useRetryLaunch } from "@/hooks/events";
import useEventActionGate from "@/hooks/events/useEventActionGate";
import { useTranslation } from "react-i18next";
import { EVENT_STATUS } from "@/utils/constants/eventStatus";
import WhatsAppContactButton from "@/ui/commen/whatsappButton/WhatsAppContactButton";
import styles from "./eventFailureBanner.module.css";

// Prefer the shared constant over a literal so a backend rename surfaces
// as an import error.
const FAILED_STATUS = EVENT_STATUS.FAILED;
const MAX_VISIBLE_ATTEMPTS = 5;

// Countdown to next retry attempt. Mirror of LAUNCH_BACKOFF_MS in
// scheduledTasks.js — the values are duplicated rather than imported so
// the FE bundle doesn't pull in server-only code. Keep in sync.
const RETRY_BACKOFF_MS = [
  5 * 60 * 1000,
  30 * 60 * 1000,
  2 * 60 * 60 * 1000,
  6 * 60 * 60 * 1000,
  12 * 60 * 60 * 1000,
];

const formatCountdown = (ms, lang) => {
  if (ms <= 0) return null;
  const totalSec = Math.ceil(ms / 1000);
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  const parts = [];
  if (hh > 0) parts.push(`${hh}h`);
  parts.push(`${mm.toString().padStart(2, "0")}m`);
  parts.push(`${ss.toString().padStart(2, "0")}s`);
  return parts.join(" ");
};

export default function EventFailureBanner({ event, currentUser, lang = "ar" }) {
  const [retryError, setRetryError] = useState(null);
  const [tick, setTick] = useState(0);
  const retryLaunch = useRetryLaunch();
  const isRtl = lang !== "en";
  const dir = isRtl ? "rtl" : "ltr";
  // i18n via react-i18next, with hard-coded Arabic strings as fallback
  // so the banner still works even when the translations file hasn't
  // been wired yet.
  let t;
  try {
    ({ t } = useTranslation("events"));
  } catch (_) {
    t = (_k, fb) => fb;
  }

  // Tick every second so the countdown re-renders. Cleared on unmount.
  useEffect(() => {
    if (!event || event.status !== EVENT_STATUS.SCHEDULED) return undefined;
    const handle = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(handle);
  }, [event?.status, event?.lastAttemptAt]);

  if (!event) return null;

  const status = event?.status;
  const attemptCount = event?.attemptCount || 0;
  const failureReason = event?.failureReason;
  const eventTitle = event?.eventDetails?.title || "";
  const lastAttemptAt = event?.lastAttemptAt
    ? new Date(event.lastAttemptAt).getTime()
    : null;

  // Retrying-state banner: scheduled + at least one attempt already burned.
  if (status === EVENT_STATUS.SCHEDULED && attemptCount > 0 && !event?.launchedAt) {
    // Compute time until the next attempt is eligible. The retry cron
    // uses the (attemptCount-1)-indexed backoff (since attempt 1 is
    // already done). Tick value is read so React re-renders.
    void tick;
    const backoff =
      RETRY_BACKOFF_MS[Math.min(attemptCount - 1, RETRY_BACKOFF_MS.length - 1)] || 0;
    const nextAttemptAt = lastAttemptAt ? lastAttemptAt + backoff : null;
    const countdownMs = nextAttemptAt ? nextAttemptAt - Date.now() : 0;
    const countdownStr = formatCountdown(countdownMs, lang);

    return (
      <div className={`${styles.banner} ${styles.retrying}`} dir={dir}>
        <div className={styles.title}>
          {t(
            "failureBanner.retrying.title",
            isRtl ? "نُعيد محاولة إطلاق مناسبتك..." : "Retrying your event launch..."
          )}
        </div>
        <div className={styles.message}>
          {isRtl
            ? `محاولة ${attemptCount} من ${MAX_VISIBLE_ATTEMPTS}. سنحاول مجدداً تلقائياً.`
            : `Attempt ${attemptCount} of ${MAX_VISIBLE_ATTEMPTS}. We'll try again automatically.`}
          {countdownStr && countdownMs > 0 ? (
            <span className={styles.countdown}>
              {" "}
              {isRtl ? `المحاولة التالية خلال ${countdownStr}` : `Next attempt in ${countdownStr}`}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  if (status !== FAILED_STATUS) return null;

  // Single source of truth for retry-button RBAC.
  // `useEventActionGate.canManualRetry` mirrors the backend
  // restrictTo on `/events/:id/retry-launch`. The server enforces the
  // same check; the UI gate just keeps the button out of the way for
  // unauthorized users.
  const { canManualRetry: canRetry } = useEventActionGate({
    event,
    user: currentUser,
  });

  const handleRetry = async () => {
    setRetryError(null);
    try {
      await retryLaunch.mutateAsync({ eventId: event._id || event.id });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "تعذّر إطلاق المناسبة. حاول مرة أخرى.";
      setRetryError(msg);
    }
  };

  const contextMessage =
    `أحتاج للمساعدة في مناسبتي "${eventTitle}" (Event ID: ${event._id || event.id})` +
    (failureReason ? ` — السبب: ${failureReason}` : "");

  return (
    <div className={`${styles.banner} ${styles.failed}`} dir={dir}>
      <div className={styles.title}>
        {t(
          "failureBanner.failed.title",
          isRtl ? "نعتذر — تعذّر إطلاق مناسبتك" : "We're sorry — your event couldn't launch"
        )}
      </div>
      <div className={styles.message}>
        {t(
          "failureBanner.failed.message",
          isRtl
            ? "لم نتمكن من إرسال الدعوات لمناسبتك. سنبذل كل جهد لمساعدتك على إطلاقها."
            : "We couldn't send your invitations. We'll do our best to help you launch."
        )}
      </div>
      {failureReason ? (
        <div className={styles.reason} data-testid="failure-reason">
          <span>{isRtl ? "سبب الفشل: " : "Reason: "}</span>
          <code>{failureReason}</code>
        </div>
      ) : null}

      <div className={styles.actions}>
        {canRetry && (
          <button
            type="button"
            className={styles.retryButton}
            onClick={handleRetry}
            disabled={retryLaunch.isPending || retryLaunch.isLoading}
            data-testid="retry-launch-button"
          >
            {retryLaunch.isPending || retryLaunch.isLoading
              ? isRtl
                ? "جارٍ إعادة المحاولة..."
                : "Retrying..."
              : isRtl
                ? "إعادة محاولة الإطلاق"
                : "Retry launch"}
          </button>
        )}
        <WhatsAppContactButton contextMessage={contextMessage} />
      </div>

      {retryError ? (
        <div className={styles.error} role="alert">
          {retryError}
        </div>
      ) : null}
    </div>
  );
}
