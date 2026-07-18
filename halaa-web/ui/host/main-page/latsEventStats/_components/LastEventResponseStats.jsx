"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import styles from "../LastEventStats.module.css";

export default function LastEventResponseStats({ event, isMobile }) {
  const { t } = useTranslation("home-events");
  const stats = event.stats || {};

  if (isMobile) {
    return (
      <div className={styles.responseRateSection}>
        <div className={styles.responseRateContainer}>
          <div className={styles.responseRateHeader}>
            <div className={styles.responseRateLabel}>
              {t("lastEvent.responseStatus")}
            </div>
            <div className={styles.responseRateText}>{event.responseRate}</div>
          </div>
          <div className={styles.responseLegend}>
            <div className={styles.legendItem}>
              <div className={`${styles.legendDot} ${styles.dotGray}`}></div>
              <div className={styles.legendText}>
                <span>{t("lastEvent.noResponse")}: </span>
                <span>{stats.invited ?? 0}</span>
              </div>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendDot} ${styles.dotRed}`}></div>
              <div className={styles.legendText}>
                <span>{t("lastEvent.declined")}: </span>
                <span>{stats.declined ?? 0}</span>
              </div>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendDot} ${styles.dotMaybe}`}></div>
              <div className={styles.legendText}>
                <span>{t("table.maybe")}: </span>
                <span>{stats.maybe ?? 0}</span>
              </div>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendDot} ${styles.dotGreen}`}></div>
              <div className={styles.legendText}>
                <span>{t("lastEvent.approved")}: </span>
                <span>{stats.confirmed ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
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
      <div className={`${styles.statBox} ${styles.statBoxMaybe}`}>
        <div className={`${styles.statLabel} ${styles.statLabelMaybe}`}>
          {t("table.maybe")}
        </div>
        <div className={`${styles.statValue} ${styles.statValueMaybe}`}>
          {stats.maybe ?? 0}
        </div>
      </div>
    </div>
  );
}
