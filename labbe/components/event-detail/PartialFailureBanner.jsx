"use client";

/**
 * Sibling of `EventFailureBanner`. Renders a softer "warning"-tier
 * banner when the event has actually launched (status `live`) but the
 * bulk send didn't deliver to every guest (`messagingStatus.failedCount
 * > 0`). `EventFailureBanner` only fires for `status === 'failed'`
 * (full-launch failure) and for in-flight retries — partial delivery
 * on a live event was previously invisible to the host.
 *
 * Any failed → show. The host can decide whether to retry the failed
 * sends from the existing failure list (out of scope here) or accept
 * the partial coverage.
 *
 * Mounted on the host single-event page next to `EventStats`.
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { useEvent } from "@/hooks/events/queries/useEvent";
import { useEventActionGate } from "@halla/shared/hooks/useEventActionGate";
import useAuthStore from "@/stores/authStore";
import { useParams } from "next/navigation";
import styles from "./eventFailureBanner.module.css";

export default function PartialFailureBanner({ eventId }) {
  const { data: eventResp } = useEvent(eventId);
  const { user } = useAuthStore();
  const params = useParams();
  const lang = params?.lang === "en" ? "en" : "ar";
  const isRtl = lang !== "en";
  const dir = isRtl ? "rtl" : "ltr";

  let t;
  try {
    ({ t } = useTranslation("events"));
  } catch (_) {
    t = (_k, fb) => fb;
  }

  const event = eventResp?.data?.event || eventResp?.event || null;
  const { hasFailedSends, failedCount, isLive } = useEventActionGate({
    event,
    currentUser: user,
  });

  if (!event) return null;
  if (!hasFailedSends) return null;

  const total = event?.messagingStatus?.totalMessages || 0;
  const sent = event?.messagingStatus?.sentCount || 0;
  const titleKey = isLive
    ? "partialFailureBanner.live.title"
    : "partialFailureBanner.completed.title";
  const titleFb = isRtl
    ? "إرسال جزئي للدعوات"
    : "Partial invitation delivery";
  const messageFb = isRtl
    ? `لم يتم إرسال ${failedCount} من أصل ${total} دعوة. ${sent} وصلت بنجاح.`
    : `${failedCount} of ${total} invitations failed to send. ${sent} delivered successfully.`;

  return (
    <div
      className={`${styles.banner} ${styles.retrying}`}
      dir={dir}
      data-testid="partial-failure-banner"
    >
      <div className={styles.title}>{t(titleKey, titleFb)}</div>
      <div className={styles.message}>
        {t("partialFailureBanner.message", {
          defaultValue: messageFb,
          failed: failedCount,
          total,
          sent,
        })}
      </div>
    </div>
  );
}
