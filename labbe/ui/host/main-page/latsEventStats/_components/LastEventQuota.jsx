"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import styles from "../LastEventStats.module.css";

export default function LastEventQuota({ quota }) {
  const { t } = useTranslation("home-events");
  if (!quota) return null;

  // Backend returns null for unlimited, a number (including 0) otherwise.
  const remaining =
    quota.remainingInvites == null
      ? t("lastEvent.quota.unlimited", "Unlimited")
      : quota.remainingInvites;

  return (
    <div className={styles.subscriptionQuota}>
      <div className={styles.quotaItem}>
        <div className={styles.quotaLabel}>
          {t("lastEvent.quota.remainingInvites")}
        </div>
        <div className={styles.quotaValue}>{remaining}</div>
      </div>
    </div>
  );
}
