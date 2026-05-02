"use client";
import React from "react";
import styles from "./cards.module.css";

export default function Cards({ stats, t }) {
  // Backend returns: { total, confirmed, checkedIn, declined, pending }
  // "pending" = invited + maybe (not separated by backend)
  const statsData = [
    {
      icon: (
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clipPath="url(#clip0_waiting)">
            <path
              d="M6 11C8.76142 11 11 8.76142 11 6C11 3.23858 8.76142 1 6 1C3.23858 1 1 3.23858 1 6C1 8.76142 3.23858 11 6 11Z"
              stroke="#374151"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M6 3V6L8 7"
              stroke="#374151"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
          <defs>
            <clipPath id="clip0_waiting">
              <rect width="12" height="12" fill="white" />
            </clipPath>
          </defs>
        </svg>
      ),
      label: t("waiting"),
      value: stats?.pending ?? 0,
      color: "#4B5563",
      bgColor: "transparent",
    },
    {
      icon: (
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clipPath="url(#clip0_checkedin)">
            <path
              d="M11 5.54286V6.00286C10.9994 7.08107 10.6503 8.1302 10.0047 8.99377C9.35908 9.85735 8.45164 10.4891 7.41768 10.7948C6.38372 11.1005 5.27863 11.0638 4.26724 10.6902C3.25584 10.3165 2.39233 9.62591 1.80548 8.7214C1.21863 7.81688 0.939896 6.74689 1.01084 5.67102C1.08178 4.59514 1.4986 3.57103 2.19914 2.7514C2.89968 1.93177 3.84639 1.36055 4.89809 1.12293C5.9498 0.885317 7.05013 0.99403 8.035 1.43286"
              stroke="#4338CA"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M3 5.5L5 7.5L9 3.5"
              stroke="#4338CA"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
          <defs>
            <clipPath id="clip0_checkedin">
              <rect width="12" height="12" fill="white" />
            </clipPath>
          </defs>
        </svg>
      ),
      label: t("checkedIn", "حضر"),
      value: stats?.checkedIn ?? 0,
      color: "#4338CA",
      bgColor: "#EEF2FF",
    },
    {
      icon: (
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clipPath="url(#clip0_declined)">
            <path
              d="M6 11C8.76142 11 11 8.76142 11 6C11 3.23858 8.76142 1 6 1C3.23858 1 1 3.23858 1 6C1 8.76142 3.23858 11 6 11Z"
              stroke="#C0392B"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M7.5 4.5L4.5 7.5"
              stroke="#C0392B"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4.5 4.5L7.5 7.5"
              stroke="#C0392B"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
          <defs>
            <clipPath id="clip0_declined">
              <rect width="12" height="12" fill="white" />
            </clipPath>
          </defs>
        </svg>
      ),
      label: t("declined"),
      value: stats?.declined ?? 0,
      color: "#C0392B",
      bgColor: "#F9EBEA",
    },
    {
      icon: (
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clipPath="url(#clip0_confirmed)">
            <path
              d="M11 5.54286V6.00286C10.9994 7.08107 10.6503 8.1302 10.0047 8.99377C9.35908 9.85735 8.45164 10.4891 7.41768 10.7948C6.38372 11.1005 5.27863 11.0638 4.26724 10.6902C3.25584 10.3165 2.39233 9.62591 1.80548 8.7214C1.21863 7.81688 0.939896 6.74689 1.01084 5.67102C1.08178 4.59514 1.4986 3.57103 2.19914 2.7514C2.89968 1.93177 3.84639 1.36055 4.89809 1.12293C5.9498 0.885317 7.05013 0.99403 8.035 1.43286"
              stroke="#2A8C5B"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4.5 5.5L6 7L11 2"
              stroke="#2A8C5B"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
          <defs>
            <clipPath id="clip0_confirmed">
              <rect width="12" height="12" fill="white" />
            </clipPath>
          </defs>
        </svg>
      ),
      label: t("confirmed"),
      value: stats?.confirmed ?? 0,
      color: "#2A8C5B",
      bgColor: "#EAF4EF",
    },
  ];

  return (
    <div className={styles.sectionContainer}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{t("eventDetails")}</h2>
      </div>

      <div className={styles.interactionCard}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>{t("invitationInteraction")}</h3>
        </div>

        <div className={styles.statsGrid}>
          {statsData.map((stat, index) => (
            <div
              key={index}
              className={styles.statCard}
              style={{
                backgroundColor: stat.bgColor,
                animationDelay: `${index * 0.1}s`,
              }}
            >
              <div className={styles.iconLabel}>
                <div className={styles.icon}>{stat.icon}</div>
                <div
                  className={styles.label}
                  style={{
                    color: stat.label === t("waiting") ? "#374151" : stat.color,
                  }}
                >
                  {stat.label}
                </div>
              </div>
              <div className={styles.value} style={{ color: stat.color }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
