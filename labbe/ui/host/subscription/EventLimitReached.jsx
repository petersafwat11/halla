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
  const { t, i18n } = useTranslation("home-events");
  const router = useRouter();
  const { currentLocale } = UseLanguageChange();
  const isArabic = i18n.language === "ar" || currentLocale === "ar";

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      router.push(`/${currentLocale}/host/plans`);
    }
  };

  const handleBackToHome = () => {
    router.push(`/${currentLocale}/host`);
  };

  const eventsUsed = subscription?.events?.used || 0;
  const eventsLimit = subscription?.events?.limit || 0;
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
          {isArabic
            ? "تم الوصول للحد الأقصى من المناسبات"
            : "Event Limit Reached"}
        </h2>

        {/* Description */}
        <p className={styles.description}>
          {isArabic
            ? `لقد استخدمت جميع المناسبات المتاحة في باقتك (${eventsUsed}/${eventsLimit}). قم بترقية باقتك للاستمتاع بمزايا أكثر وإنشاء مناسبات إضافية.`
            : `You have used all available events in your plan (${eventsUsed}/${eventsLimit}). Upgrade your plan to enjoy more features and create additional events.`}
        </p>

        {/* Usage Stats */}
        <div className={styles.usageCard}>
          <div className={styles.usageHeader}>
            <span className={styles.usageLabel}>
              {isArabic ? "استخدام المناسبات" : "Events Usage"}
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
              {isArabic ? "الباقة الحالية:" : "Current Plan:"}
            </span>
            <span className={styles.planName}>
              {planType === "lite"
                ? isArabic
                  ? "لايت"
                  : "Lite"
                : planType === "pro"
                ? isArabic
                  ? "برو"
                  : "Pro"
                : planType === "elite"
                ? isArabic
                  ? "إيليت"
                  : "Elite"
                : planType}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <Button
            variant="primary"
            title={isArabic ? "ترقية الباقة" : "Upgrade Plan"}
            onClick={handleUpgrade}
            className={styles.upgradeButton}
          />
          <Button
            variant="secondary"
            title={isArabic ? "العودة للرئيسية" : "Back to Home"}
            onClick={handleBackToHome}
            className={styles.backButton}
          />
        </div>

        {/* Features hint */}
        <div className={styles.featuresHint}>
          <h4 className={styles.featuresTitle}>
            {isArabic ? "مميزات الترقية:" : "Upgrade Benefits:"}
          </h4>
          <ul className={styles.featuresList}>
            <li>
              {isArabic ? "مناسبات أكثر شهرياً" : "More events per month"}
            </li>
            <li>
              {isArabic ? "ضيوف أكثر لكل مناسبة" : "More guests per event"}
            </li>
            <li>
              {isArabic
                ? "رسائل متابعة إضافية"
                : "Additional follow-up messages"}
            </li>
            <li>
              {isArabic ? "تخصيص العلامة التجارية" : "Custom branding options"}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default EventLimitReached;
