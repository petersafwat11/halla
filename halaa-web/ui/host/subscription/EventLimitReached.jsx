"use client";
import React from "react";
import styles from "./EventLimitReached.module.css";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import UseLanguageChange from "@/hooks/UseLanguageChange";
import Image from "next/image";
import Button from "@/ui/commen/button/Button";

/**
 * EventLimitReached Component
 * Displays when user has reached their event creation limit
 */
function EventLimitReached({ subscription, onUpgrade }) {
  const { t } = useTranslation("home-events");
  const router = useRouter();
  const { currentLocale } = UseLanguageChange();

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      router.push(`/${currentLocale}/host/plans?origin=event_gate&returnTo=event_create`);
    }
  };

  const handleBackToHome = () => {
    router.push(`/${currentLocale}/host`);
  };

  // Normalized subscription shape from backend:
  // { eventsUsed, eventsRemaining, planType, isSingleEvent, isPoolPlan }
  const eventsUsed = subscription?.eventsUsed ?? 0;
  const eventsRemaining = subscription?.eventsRemaining ?? 0;
  const eventsLimit = subscription?.isSingleEvent
    ? 1
    : eventsRemaining === -1
      ? -1
      : eventsUsed + eventsRemaining;
  const planType = subscription?.planType || "lite";

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Icon */}
        <div className={styles.iconWrapper}>
          <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="40" cy="40" r="40" fill="#FFF3E0" />
            <path
              d="M40 24C31.2 24 24 31.2 24 40C24 48.8 31.2 56 40 56C48.8 56 56 48.8 56 40C56 31.2 48.8 24 40 24ZM41.6 48H38.4V44.8H41.6V48ZM41.6 41.6H38.4V32H41.6V41.6Z"
              fill="#F57C00"
            />
          </svg>
        </div>

        {/* Title */}
        <h2 className={styles.title}>
          {t("subscription.eventLimitReached")}
        </h2>

        {/* Description */}
        <p className={styles.description}>
          {t("subscription.eventLimitDescription", { eventsUsed, eventsLimit })}
        </p>

        {/* Usage Stats */}
        <div className={styles.usageCard}>
          <div className={styles.usageHeader}>
            <span className={styles.usageLabel}>
              {t("subscription.eventsUsage")}
            </span>
            <span className={styles.usageValue}>
              {eventsUsed}/{eventsLimit}
            </span>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: "100%" }} />
          </div>
          <div className={styles.planBadge}>
            <span className={styles.planLabel}>
              {t("subscription.currentPlan")}
            </span>
            <span className={styles.planName}>
              {planType === "lite"
                ? t("subscription.planLite")
                : planType === "pro"
                ? t("subscription.planPro")
                : planType === "elite"
                ? t("subscription.planElite")
                : planType}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <Button
            variant="primary"
            title={t("subscription.upgradePlan")}
            onClick={handleUpgrade}
            className={styles.upgradeButton}
          />
          <Button
            variant="secondary"
            title={t("subscription.backToHome")}
            onClick={handleBackToHome}
            className={styles.backButton}
          />
        </div>

        {/* Features hint */}
        <div className={styles.featuresHint}>
          <h4 className={styles.featuresTitle}>
            {t("subscription.upgradeFeatures")}
          </h4>
          <ul className={styles.featuresList}>
            <li>
              {t("subscription.moreEventsPerMonth")}
            </li>
            <li>
              {t("subscription.moreGuestsPerEvent")}
            </li>
            <li>
              {t("subscription.additionalFollowUp")}
            </li>
            <li>
              {t("subscription.customBranding")}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default EventLimitReached;
