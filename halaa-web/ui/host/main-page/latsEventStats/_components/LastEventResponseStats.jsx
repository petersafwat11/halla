"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import styles from "../LastEventStats.module.css";

export default function LastEventResponseStats({ event, isMobile }) {
  const { t } = useTranslation("home-events");
  const stats = event.stats || {};

  return (
    <div className={styles.responseStatsBlock}>
      {isMobile && (
        <div className={styles.responseRateHeader}>
          <div className={styles.responseRateLabel}>{t("lastEvent.responseStatus")}</div>
          <div className={styles.responseRateText}>{event.responseRate}</div>
        </div>
      )}
      <div className={styles.statsContainer}>
        <div className={styles.statBox}>
          <div className={styles.statLabel}>{t("lastEvent.noResponse")}</div>
          <div className={styles.statValue}>{stats.invited ?? 0}</div>
        </div>
        <div className={`${styles.statBox} ${styles.statBoxDeclined}`}>
          <div className={`${styles.statLabel} ${styles.statLabelDeclined}`}>
            {t("lastEvent.declined")}
          </div>
          <div className={`${styles.statValue} ${styles.statValueDeclined}`}>
            {stats.declined ?? 0}
          </div>
        </div>
        <div className={`${styles.statBox} ${styles.statBoxApproved}`}>
          <div className={`${styles.statLabel} ${styles.statLabelApproved}`}>
            {t("lastEvent.approved")}
          </div>
          <div className={`${styles.statValue} ${styles.statValueApproved}`}>
            {stats.confirmed ?? 0}
          </div>
        </div>
      </div>
    </div>
  );
}
