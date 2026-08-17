"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { FiSend } from "react-icons/fi";
import styles from "./RemainingInvitesBanner.module.css";
import { useEvent } from "@/hooks/events";

/**
 * Small stat banner on the single-event page showing how many invites the
 * host has left in their pool. Adding guests is free — invites are charged
 * only when an invitation or reminder is actually sent.
 *
 * `event.subscription.invitesRemaining` (from `getEventById`/`useEvent`) is a
 * real number for both pool and per-event plans now; `null` means truly
 * unlimited (admin/super-admin). When there's no subscription summary at all
 * (e.g. legacy events) the banner stays hidden.
 */
export default function RemainingInvitesBanner({ eventId }) {
  const { t } = useTranslation("home-events");
  const { data } = useEvent(eventId);

  const event = data?.data?.event;
  const subscription = event?.subscription;

  // Hide when there's no subscription summary attached to the event.
  if (!subscription) return null;

  const remaining = subscription.invitesRemaining;
  const display =
    remaining == null
      ? t("remainingInvites.unlimited", "Unlimited")
      : remaining;

  return (
    <div className={styles.banner} role="note">
      <span className={styles.iconWrap} aria-hidden="true">
        <FiSend className={styles.icon} />
      </span>
      <span className={styles.text}>
        {t("remainingInvites.label", "Invites left")}
        <strong className={styles.value}>{display}</strong>
      </span>
      <span
        className={styles.tooltip}
        title={t(
          "remainingInvites.tooltip",
          "Invites left = pool + extras + compensation − sent. Adding guests is free; you're charged only when an invitation or reminder is sent."
        )}
        aria-label={t(
          "remainingInvites.tooltip",
          "Invites left = pool + extras + compensation − sent. Adding guests is free; you're charged only when an invitation or reminder is sent."
        )}
      >
        ?
      </span>
    </div>
  );
}
