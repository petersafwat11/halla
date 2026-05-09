"use client";
import React from "react";
import styles from "./GuestQuotaCounter.module.css";
import { useTranslation } from "react-i18next";
import UseLanguageChange from "@/hooks/UseLanguageChange";

/**
 * GuestQuotaCounter Component
 * Shows guest usage against subscription limits
 */
function GuestQuotaCounter({ currentGuests = 0, subscription }) {
  const { i18n } = useTranslation("home-events");
  const { currentLocale } = UseLanguageChange();
  const isArabic = i18n.language === "ar" || currentLocale === "ar";

  // Normalized subscription shape from backend:
  // { guestLimit, isGuestUnlimited, isPoolPlan, invitePool, invitesRemaining }
  // For pool plans the effective per-event cap is `invitesRemaining` — pool plans
  // have no per-event cap but the global pool constrains how many guests can be
  // added to THIS event right now. ∞ is reserved for the platform-admin / unlimited
  // plan bypass where there is no cap at all.
  const isPoolPlan = subscription?.isPoolPlan === true;
  const invitesRemaining = Number.isFinite(subscription?.invitesRemaining)
    ? subscription.invitesRemaining
    : null;
  const rawGuestLimit = subscription?.guestLimit ?? 0;
  const isUnlimited = (subscription?.isGuestUnlimited ?? false) && !isPoolPlan;
  const effectiveLimit = isPoolPlan ? (invitesRemaining ?? 0) : rawGuestLimit;
  const hasSubscription = !!subscription;

  // Calculate percentage for progress bar
  const percentage = isUnlimited
    ? 0
    : effectiveLimit > 0
    ? Math.min(100, Math.round((currentGuests / effectiveLimit) * 100))
    : 0;

  // Determine status color
  const getStatusColor = () => {
    if (isUnlimited) return "green";
    if (percentage >= 100) return "red";
    if (percentage >= 80) return "orange";
    return "green";
  };

  const statusColor = getStatusColor();
  const remaining = isUnlimited ? "∞" : Math.max(0, effectiveLimit - currentGuests);
  const isLimitReached = !isUnlimited && currentGuests >= effectiveLimit;

  if (!hasSubscription) {
    return (
      <div className={styles.container}>
        <div className={styles.noSubscription}>
          <span className={styles.warningIcon}>⚠️</span>
          <span className={styles.warningText}>
            {isArabic
              ? "يرجى الاشتراك لإضافة ضيوف"
              : "Please subscribe to add guests"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M16 11C17.66 11 18.99 9.66 18.99 8C18.99 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11ZM8 11C9.66 11 10.99 9.66 10.99 8C10.99 6.34 9.66 5 8 5C6.34 5 5 6.34 5 8C5 9.66 6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V19H15V16.5C15 14.17 10.33 13 8 13ZM16 13C15.71 13 15.38 13.02 15.03 13.05C16.19 13.89 17 15.02 17 16.5V19H23V16.5C23 14.17 18.33 13 16 13Z"
              fill="#656565"
            />
          </svg>
          <span className={styles.title}>
            {isArabic ? "حصة الضيوف" : "Guest Quota"}
          </span>
        </div>
        <div className={`${styles.counter} ${styles[statusColor]}`}>
          {isUnlimited ? (
            <span>∞</span>
          ) : (
            <span>
              {currentGuests}/{effectiveLimit}
            </span>
          )}
        </div>
      </div>

      {!isUnlimited && (
        <div className={styles.progressWrapper}>
          <div className={styles.progressBar}>
            <div
              className={`${styles.progressFill} ${
                styles[`fill${statusColor}`]
              }`}
              style={{ width: `${Math.min(100, percentage)}%` }}
            />
          </div>
        </div>
      )}

      <div className={styles.footer}>
        {isUnlimited ? (
          <span className={styles.unlimited}>
            <span className={styles.checkIcon}>✓</span>
            {isArabic ? "ضيوف غير محدودين" : "Unlimited guests"}
          </span>
        ) : isLimitReached ? (
          <span className={styles.limitReached}>
            <span className={styles.warningIcon}>⚠️</span>
            {isArabic
              ? "تم الوصول للحد الأقصى من الضيوف"
              : "Guest limit reached"}
          </span>
        ) : (
          <span className={styles.remaining}>
            {isArabic
              ? `متبقي ${remaining} ضيف`
              : `${remaining} guests remaining`}
          </span>
        )}
      </div>
    </div>
  );
}

export default GuestQuotaCounter;
