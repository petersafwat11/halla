"use client";
import { FaCalendarAlt, FaUsers, FaCheckCircle } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import styles from "../page.module.css";

export default function PlanCard({ plan, isCurrent, isSubscribing, onSubscribe }) {
  const { t, i18n } = useTranslation("whitelabelPlans");
  const isArabic = i18n.language === "ar";

  const price =
    plan.pricing?.oneTime?.amount ?? plan.pricing?.oneTime ?? null;

  const formatPrice = (val) =>
    new Intl.NumberFormat("ar-SA", {
      style: "currency",
      currency: "SAR",
      minimumFractionDigits: 0,
    }).format(val || 0);

  return (
    <div
      className={`${styles.planCard} ${isCurrent ? styles.currentPlanHighlight : ""} ${plan.isPopular ? styles.popularPlan : ""}`}
    >
      {plan.badge && (
        <div className={styles.popularBadge}>
          {isArabic ? plan.badge.labelAr : plan.badge.labelEn}
        </div>
      )}

      <div className={styles.planCardHeader}>
        <h3 className={styles.planCardName}>
          {isArabic ? plan.nameAr : plan.nameEn}
        </h3>
        <p className={styles.planCardDescription}>
          {isArabic ? plan.descriptionAr : plan.descriptionEn}
        </p>
      </div>

      <div className={styles.planCardPrice}>
        <span className={styles.priceAmount}>{formatPrice(price)}</span>
      </div>

      <div className={styles.planCardLimits}>
        <div className={styles.limitItem}>
          <FaCalendarAlt className={styles.limitIcon} />
          <span>
            {plan.limits?.maxEventsPerMonth === -1
              ? "∞"
              : plan.limits?.maxEventsPerMonth}{" "}
            {t("plansPage.currentPlan.eventsPerMonth")}
          </span>
        </div>
        <div className={styles.limitItem}>
          <FaUsers className={styles.limitIcon} />
          <span>
            {plan.limits?.maxGuestsPerEvent === -1
              ? "∞"
              : plan.limits?.maxGuestsPerEvent}{" "}
            {t("plansPage.currentPlan.guestsPerEvent")}
          </span>
        </div>
      </div>

      {plan.features && plan.features.length > 0 && (
        <div className={styles.planCardFeatures}>
          <ul className={styles.featuresList}>
            {plan.features.map((feature, index) => (
              <li key={index} className={styles.featureItem}>
                <FaCheckCircle className={styles.featureIcon} />
                <span>{isArabic ? feature.labelAr : feature.labelEn}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        className={`${styles.planCardBtn} ${isCurrent ? styles.currentBtn : ""}`}
        onClick={() => onSubscribe(plan)}
        disabled={isCurrent || isSubscribing}
      >
        {isSubscribing
          ? t("plansPage.planCard.subscribing")
          : isCurrent
            ? t("plansPage.planCard.currentPlan")
            : t("plansPage.planCard.subscribeNow")}
      </button>
    </div>
  );
}
