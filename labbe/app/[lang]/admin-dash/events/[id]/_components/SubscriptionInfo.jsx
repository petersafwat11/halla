"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import styles from "./SubscriptionInfo.module.css";

export default function SubscriptionInfo({ subscription }) {
  const { t, i18n } = useTranslation("adminEvents");
  const currentLang = i18n.language || "ar";

  if (!subscription) return null;

  const formatNumber = (num) => {
    if (num === -1 || num === "unlimited") return "∞";
    return num?.toLocaleString() || "0";
  };

  const getStatusInfo = (used, limit, isUnlimited) => {
    if (isUnlimited || limit === -1 || limit === "unlimited") {
      return { color: "#10B981", bgColor: "#ECFDF5", status: "good" };
    }
    const percentage = limit > 0 ? (used / limit) * 100 : 0;
    if (percentage >= 90)
      return { color: "#EF4444", bgColor: "#FEF2F2", status: "critical" };
    if (percentage >= 70)
      return { color: "#F59E0B", bgColor: "#FFFBEB", status: "warning" };
    return { color: "#10B981", bgColor: "#ECFDF5", status: "good" };
  };

  const getProgressPercentage = (used, limit, isUnlimited) => {
    if (isUnlimited || limit === -1 || limit === "unlimited" || limit === 0)
      return 0;
    return Math.min((used / limit) * 100, 100);
  };

  // Format expiry date
  const formatExpiryDate = (date) => {
    if (!date) return null;
    const expiryDate = new Date(date);
    const now = new Date();
    const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    return {
      formatted: expiryDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      daysRemaining,
      isExpiringSoon: daysRemaining <= 30 && daysRemaining > 0,
      isExpired: daysRemaining <= 0,
    };
  };

  const expiryInfo = formatExpiryDate(subscription.expiresAt);

  const stats = [
    {
      id: "guests",
      label: t("singleEvent.subscription.remainingGuests"),
      value: subscription.guests?.isUnlimited
        ? "∞"
        : formatNumber(subscription.guests?.remaining || 0),
      total: subscription.guests?.isUnlimited
        ? null
        : subscription.guests?.limitPerEvent || 0,
      used: subscription.guests?.usedInEvent || 0,
      isUnlimited: subscription.guests?.isUnlimited,
      icon: (color) => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M17 21V19C17 16.79 15.21 15 13 15H5C2.79 15 1 16.79 1 19V21"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="9" cy="7" r="4" stroke={color} strokeWidth="2" />
          <path
            d="M23 21V19C22.99 17.18 21.77 15.59 20 15.13"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M16 3.13C17.78 3.59 19 5.18 19 7C19 8.82 17.78 10.41 16 10.87"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      id: "compensation",
      label: t("singleEvent.subscription.compensationInvitations"),
      value: formatNumber(subscription.compensationInvitations?.remaining || 0),
      total: subscription.compensationInvitations?.limit || 0,
      used: subscription.compensationInvitations?.used || 0,
      isUnlimited: false,
      icon: (color) => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M22 11.08V12C21.99 17.52 17.52 21.99 12 22C6.48 22 2 17.52 2 12C2 6.48 6.48 2 12 2C13.85 2 15.55 2.5 17 3.35"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M22 4L12 14.01L9 11.01"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      id: "events",
      label: t("singleEvent.subscription.remainingEvents"),
      value: subscription.events?.isUnlimited
        ? "∞"
        : formatNumber(subscription.events?.remaining || 0),
      total: subscription.events?.isUnlimited
        ? null
        : subscription.events?.limit || 0,
      used: subscription.events?.used || 0,
      isUnlimited: subscription.events?.isUnlimited,
      icon: (color) => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect
            x="3"
            y="4"
            width="18"
            height="18"
            rx="2"
            stroke={color}
            strokeWidth="2"
          />
          <path
            d="M16 2V6M8 2V6M3 10H21"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
  ];

  // Get plan name based on current language
  const planName = subscription.planName
    ? currentLang === "ar"
      ? subscription.planName.ar
      : subscription.planName.en
    : subscription.planType || "N/A";

  return (
    <div className={styles.container}>
      {/* Compact Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.planBadge} data-status={subscription.status}>
            <span className={styles.planDot} />
            {planName}
          </span>
          <span className={styles.title}>
            {t("singleEvent.subscription.title")}
          </span>
        </div>
        {expiryInfo && (
          <div className={styles.expiryWrapper}>
            <span className={styles.expiryLabel}>
              {t("singleEvent.subscription.expires")}
            </span>
            <span
              className={styles.expiryValue}
              data-status={
                expiryInfo.isExpired
                  ? "expired"
                  : expiryInfo.isExpiringSoon
                  ? "warning"
                  : "normal"
              }
            >
              {expiryInfo.formatted}
              {!expiryInfo.isExpired && (
                <span className={styles.daysRemaining}>
                  ({expiryInfo.daysRemaining}{" "}
                  {t("singleEvent.subscription.days")})
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className={styles.statsRow}>
        {stats.map((stat) => {
          const statusInfo = getStatusInfo(
            stat.used,
            stat.total,
            stat.isUnlimited
          );
          const progress = getProgressPercentage(
            stat.used,
            stat.total,
            stat.isUnlimited
          );

          return (
            <div key={stat.id} className={styles.statItem}>
              <div
                className={styles.statIcon}
                style={{ background: statusInfo.bgColor }}
              >
                {stat.icon(statusInfo.color)}
              </div>
              <div className={styles.statContent}>
                <div className={styles.statTop}>
                  <span className={styles.statLabel}>{stat.label}</span>
                  <div className={styles.statValueGroup}>
                    <span
                      className={styles.statValue}
                      style={{ color: statusInfo.color }}
                    >
                      {stat.value}
                    </span>
                    {stat.total !== null && (
                      <span className={styles.statTotal}>
                        /{formatNumber(stat.total)}
                      </span>
                    )}
                  </div>
                </div>
                {!stat.isUnlimited && stat.total > 0 && (
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${progress}%`,
                        background: statusInfo.color,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
