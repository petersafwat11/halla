"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import styles from "../LastEventStats.module.css";

export default function LastEventQuota({ quota }) {
  const { t } = useTranslation("home-events");
  if (!quota) return null;

  // Backend returns null for unlimited.
  const remaining =
    quota.remainingGuests == null
      ? t("lastEvent.quota.unlimited", "Unlimited")
      : quota.remainingGuests;

  return (
    <div className={styles.subscriptionQuota}>
      <div className={styles.quotaItem}>
        <div className={styles.quotaLabel}>
          {t("lastEvent.quota.remainingGuests")}
        </div>
        <div className={styles.quotaValue}>{remaining}</div>
      </div>
      <div className={styles.quotaSeparator} />
      <div className={styles.quotaItem}>
        <div className={styles.quotaLabel}>
          {t("lastEvent.quota.compensationMessages")}
        </div>
        <div className={styles.quotaValue}>{quota.compensationMessages ?? 0}</div>
      </div>
    </div>
  );
}
