"use client";
import React from "react";
import styles from "./cards.module.css";

const TotalIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.94 4.77c-.04-.01-.09-.01-.13 0a1.78 1.78 0 0 1-1.72-1.78c0-.99.8-1.79 1.79-1.79s1.79.8 1.79 1.79c-.01.96-.77 1.74-1.73 1.78ZM11.25 9.55c.99.16 2.08 0 2.85-.48.96-.64.96-1.69 0-2.33-.78-.49-1.88-.65-2.87-.48M4.04 4.77c.04-.01.09-.01.13 0a1.78 1.78 0 0 0 1.72-1.78c0-.99-.8-1.79-1.79-1.79s-1.79.8-1.79 1.79c.01.96.77 1.74 1.73 1.78ZM4.73 9.55c-.99.16-2.08 0-2.85-.48-.96-.64-.96-1.69 0-2.33.78-.49 1.88-.65 2.87-.48M8 9.75a1.78 1.78 0 0 1-1.72-1.78c0-.99.8-1.79 1.79-1.79s1.79.8 1.79 1.79c-.01.96-.77 1.74-1.73 1.78H8.07M6.12 11.85c-.96.64-.96 1.69 0 2.33 1.09.73 2.87.73 3.96 0 .96-.64.96-1.69 0-2.33-1.08-.72-2.87-.72-3.96 0Z" stroke="#c28e5c" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ConfirmedIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14.67 7.39v.61a6.67 6.67 0 1 1-3.95-6.1" stroke="#2A8C5B" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 7.33 8 9.33l6.67-6.66" stroke="#2A8C5B" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DeclinedIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 14.67A6.67 6.67 0 1 0 8 1.33a6.67 6.67 0 0 0 0 13.34Z" stroke="#C0392B" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 6 6 10M6 6l4 4" stroke="#C0392B" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CheckedInIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14.67 7.39v.61a6.67 6.67 0 1 1-3.95-6.1" stroke="#4338CA" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 7.33 6.67 10 14.67 2" stroke="#4338CA" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const STAT_CONFIG = [
  { icon: <TotalIcon />, labelKey: "stats.total", valueKey: "total", variant: "total" },
  { icon: <ConfirmedIcon />, labelKey: "stats.confirmed", valueKey: "confirmed", variant: "confirmed" },
  { icon: <DeclinedIcon />, labelKey: "stats.declined", valueKey: "declined", variant: "declined" },
  { icon: <CheckedInIcon />, labelKey: "stats.checkedIn", valueKey: "checkedIn", variant: "checkedIn" },
];

export default function Cards({ stats, t }) {
  return (
    <div className={styles.sectionContainer}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{t("eventDetails")}</h2>
      </div>

      <div className={styles.interactionCard}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>{t("invitationInteraction")}</h3>
        </div>

        <ul className={styles.statsList}>
          {STAT_CONFIG.map((stat) => (
            <li key={stat.variant} className={styles.statItem}>
              <div className={styles.statLabelGroup}>
                <span className={`${styles.iconCircle} ${styles[`iconCircle--${stat.variant}`]}`}>
                  {stat.icon}
                </span>
                <span className={styles.statLabel}>{t(stat.labelKey)}</span>
              </div>
              <span className={`${styles.statValue} ${styles[`statValue--${stat.variant}`]}`}>
                {stats?.[stat.valueKey] ?? 0}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
