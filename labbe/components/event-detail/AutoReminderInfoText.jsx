"use client";

import { useTranslation } from "react-i18next";
import styles from "./AutoReminderInfoText.module.css";

/**
 * Small inline banner shown on the single-event page reminding the host
 * (or platform admin viewing the host's event) that the platform auto-
 * sends a reminder 24 hours before the event. The backend cron fires
 * regardless — this is purely informational.
 */
export default function AutoReminderInfoText() {
  const { t } = useTranslation("home-events");
  return (
    <div className={styles.banner} role="note">
      <span className={styles.dot} aria-hidden="true">●</span>
      <span className={styles.text}>
        {t(
          "singleEvent.autoReminderInfo",
          "We automatically send a reminder to your guests 24 hours before the event."
        )}
      </span>
    </div>
  );
}
