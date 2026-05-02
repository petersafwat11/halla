"use client";

/**
 * EventFailureBanner — Phase 3c.4 (FLOW-15-F03 / F04 / F05).
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

import React, { useState } from "react";
import { useRetryLaunch } from "@/hooks/events";
import WhatsAppContactButton from "@/ui/commen/whatsappButton/WhatsAppContactButton";
import styles from "./eventFailureBanner.module.css";

const FAILED_STATUS = "failed";
const MAX_VISIBLE_ATTEMPTS = 5;

export default function EventFailureBanner({ event, currentUser }) {
  const [retryError, setRetryError] = useState(null);
  const retryLaunch = useRetryLaunch();

  if (!event) return null;

  const status = event?.status;
  const attemptCount = event?.attemptCount || 0;
  const failureReason = event?.failureReason;
  const eventTitle = event?.eventDetails?.title || "";

  // Retrying-state banner: scheduled + at least one attempt already burned.
  if (status === "scheduled" && attemptCount > 0 && !event?.launchedAt) {
    return (
      <div className={`${styles.banner} ${styles.retrying}`} dir="rtl">
        <div className={styles.title}>نُعيد محاولة إطلاق مناسبتك...</div>
        <div className={styles.message}>
          محاولة {attemptCount} من {MAX_VISIBLE_ATTEMPTS}. سنحاول مجدداً تلقائياً.
        </div>
      </div>
    );
  }

  if (status !== FAILED_STATUS) return null;

  // Permission for the retry button (server enforces too).
  const userRole = currentUser?.role;
  const userId = currentUser?._id || currentUser?.id;
  const userWhitelabelId = currentUser?.whitelabelId;
  const eventWhitelabelId = event?.whitelabelId;
  const eventHostId = event?.host?._id || event?.host;

  const canRetry =
    eventHostId?.toString?.() === userId?.toString?.() ||
    userRole === "admin" ||
    userRole === "super_admin" ||
    (userRole === "whitelabel_admin" &&
      eventWhitelabelId &&
      userWhitelabelId &&
      eventWhitelabelId.toString() === userWhitelabelId.toString());

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
    <div className={`${styles.banner} ${styles.failed}`} dir="rtl">
      <div className={styles.title}>نعتذر — تعذّر إطلاق مناسبتك</div>
      <div className={styles.message}>
        لم نتمكن من إرسال الدعوات لمناسبتك. سنبذل كل جهد لمساعدتك على إطلاقها.
      </div>
      {failureReason ? (
        <div className={styles.reason} data-testid="failure-reason">
          <span>سبب الفشل: </span>
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
              ? "جارٍ إعادة المحاولة..."
              : "إعادة محاولة الإطلاق"}
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
