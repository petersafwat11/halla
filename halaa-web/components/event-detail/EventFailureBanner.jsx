"use client";

/**
 * EventFailureBanner.
 *
 * Renders the "we're sorry" UI on the host event detail page when the
 * event is in `failed` status, plus a softer "we're retrying"
 * announcement when an in-flight retry is detected (status `scheduled`
 * with `attemptCount > 0`).
 *
 * The retry button shows for the host (creator), admin and super_admin.
 * The backend route enforces RBAC again — the UI gate is just to keep
 * the button out of the way for unauthorized users.
 */

import React, { useEffect, useState } from "react";
import { useRetryLaunch } from "@/hooks/events";
import useEventActionGate from "@halaa/shared/hooks/useEventActionGate";
import { useTranslation } from "react-i18next";
import { EVENT_STATUS } from "@halaa/shared/constants/eventStatus";
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
  const { t } = useTranslation("events");

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
      <div className={`${styles.banner} ${styles.retrying}`}>
        <div className={styles.titleRow}>
          <span className={styles.iconWrap} aria-hidden="true">
            <svg
              className={styles.spinner}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeOpacity="0.25"
                strokeWidth="2.5"
              />
              <path
                d="M21 12a9 9 0 0 0-9-9"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <h3 className={styles.title}>
            {t("failureBanner.retrying.title")}
          </h3>
        </div>

        <p className={styles.message}>
          {t("failureBanner.retrying.attemptCount", { attempt: attemptCount, max: MAX_VISIBLE_ATTEMPTS })}
        </p>

        <div className={styles.progress} aria-label={`${attemptCount}/${MAX_VISIBLE_ATTEMPTS}`}>
          {Array.from({ length: MAX_VISIBLE_ATTEMPTS }).map((_, i) => {
            const idx = i + 1;
            const cls =
              idx < attemptCount
                ? `${styles.dot} ${styles.dotActive}`
                : idx === attemptCount
                  ? `${styles.dot} ${styles.dotCurrent}`
                  : styles.dot;
            return <span key={i} className={cls} />;
          })}
        </div>

        {countdownStr && countdownMs > 0 ? (
          <div className={styles.countdownPill}>
            <span className={styles.countdownDot} aria-hidden="true" />
            <span>
              {t("failureBanner.retrying.nextAttempt", { countdown: countdownStr })}
            </span>
          </div>
        ) : null}
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
    currentUser,
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
    <div className={`${styles.banner} ${styles.failed}`}>
      <div className={styles.titleRow}>
        <span className={styles.iconWrap} aria-hidden="true">
          <svg
            className={styles.icon}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.2" />
            <path
              d="M12 7.5v5.5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle cx="12" cy="16.2" r="1.1" fill="currentColor" />
          </svg>
        </span>
        <h3 className={styles.title}>
          {t("failureBanner.failed.title")}
        </h3>
      </div>
      <p className={styles.message}>
        {t("failureBanner.failed.message")}
      </p>
      {failureReason ? (
        <div className={styles.reason} data-testid="failure-reason">
          <span>{t("failureBanner.failed.reason")}</span>
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
              ? t("failureBanner.retryButton.retrying")
              : t("failureBanner.retryButton.idle")}
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
