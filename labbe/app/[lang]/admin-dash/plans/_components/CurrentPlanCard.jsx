"use client";
import { FaCalendarAlt, FaUsers, FaCheckCircle, FaCrown, FaRocket } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import styles from "../page.module.css";

export default function CurrentPlanCard({ subscription, plans }) {
  const { t, i18n } = useTranslation("whitelabelPlans");
  const isArabic = i18n.language === "ar";

  const hasActiveSubscription = subscription && subscription.status === "active";
  const currentPlan = subscription?.plan;

  const fullPlan =
    plans.find((p) => {
      if (p.code && currentPlan?.code && p.code === currentPlan.code) return true;
      const pId = p._id || p.id;
      const currentId = currentPlan?._id || currentPlan?.id;
      if (pId && currentId && pId === currentId) return true;
      return false;
    }) || currentPlan;

  const displayLimits = fullPlan?.limits || subscription?.limits || {};

  return (
    <div className={styles.currentPlanSection}>
      <h2 className={styles.sectionTitle}>
        {hasActiveSubscription
          ? t("plansPage.currentPlan.title")
          : t("plansPage.subscriptionStatus")}
      </h2>

      {hasActiveSubscription ? (
        <div className={styles.currentPlanCard}>
          <div className={styles.currentPlanHeader}>
            <div className={styles.planInfo}>
              <FaCrown className={styles.planIcon} />
              <span className={styles.planName}>
                {isArabic ? fullPlan?.nameAr : fullPlan?.nameEn}
              </span>
              <span className={styles.activeBadge}>
                {t("plansPage.currentPlan.badge")}
              </span>
            </div>
            <div className={styles.planPrice}>
              {new Intl.NumberFormat("ar-SA", {
                style: "currency",
                currency: "SAR",
                minimumFractionDigits: 0,
              }).format(subscription?.pricePaid?.amount || 0)}
            </div>
          </div>
          <div className={styles.currentPlanDetails}>
            <div className={styles.detailItem}>
              <FaCalendarAlt className={styles.detailIcon} />
              <span className={styles.detailLabel}>
                {t("plansPage.planCard.eventsPerMonth")}
              </span>
              <span className={styles.detailValue}>
                {displayLimits?.maxEventsPerMonth === -1
                  ? "∞"
                  : displayLimits?.maxEventsPerMonth}
              </span>
            </div>
            <div className={styles.detailItem}>
              <FaUsers className={styles.detailIcon} />
              <span className={styles.detailLabel}>
                {t("plansPage.planCard.guestsPerEvent")}
              </span>
              <span className={styles.detailValue}>
                {displayLimits?.maxGuestsPerEvent === -1
                  ? "∞"
                  : displayLimits?.maxGuestsPerEvent}
              </span>
            </div>
            {subscription.expiresAt && (
              <div className={styles.detailItem}>
                <FaCheckCircle className={styles.detailIcon} />
                <span className={styles.detailLabel}>
                  {t("plansPage.currentPlan.validUntil")}
                </span>
                <span className={styles.detailValue}>
                  {new Date(subscription.expiresAt).toLocaleDateString(
                    isArabic ? "ar-SA" : "en-US"
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.noSubscriptionCard}>
          <FaRocket className={styles.noSubIcon} />
          <h3 className={styles.noSubTitle}>
            {t("plansPage.noSubscription.title")}
          </h3>
          <p className={styles.noSubText}>
            {t("plansPage.noSubscription.text")}
          </p>
        </div>
      )}
    </div>
  );
}
