"use client";
import { FaCalendarAlt, FaUsers, FaCheckCircle } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { getLocalized } from "@/utils/locale";
import styles from "../page.module.css";

const POOL_PLAN_TYPES = new Set([
  "business_quarterly",
  "business_annual",
  "basic_monthly",
  "premium_monthly",
  "unlimited",
]);

const isPoolPlan = (planType) => POOL_PLAN_TYPES.has(planType);

export default function PlanCard({ plan, isCurrent, isSubscribing, onSubscribe }) {
  const { t, i18n } = useTranslation("businessPlans");

  const price = plan.pricing?.oneTime ?? null;
  const currency = plan.currency || "SAR";
  const featuresArray = plan.featuresArray || [];

  const formatPrice = (val) =>
    new Intl.NumberFormat(i18n.language === "ar" ? "ar-SA" : "en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(val || 0);

  const pool = isPoolPlan(plan.planType);
  const inviteValue = pool
    ? plan.limits?.invitePool
    : plan.limits?.maxInvitesPerEvent;
  const eventValue = plan.limits?.maxEvents;
  const unlimited = t("plansPage.currentPlan.unlimited");

  return (
    <div
      className={`${styles.planCard} ${isCurrent ? styles.currentPlanHighlight : ""} ${plan.isPopular ? styles.popularPlan : ""}`}
    >
      <div className={styles.planCardHeader}>
        <h3 className={styles.planCardName}>
          {getLocalized(plan, "name", i18n.language)}
        </h3>
        <p className={styles.planCardDescription}>
          {getLocalized(plan, "description", i18n.language)}
        </p>
      </div>

      <div className={styles.planCardPrice}>
        <span className={styles.priceAmount}>{formatPrice(price)}</span>
      </div>

      <div className={styles.planCardLimits}>
        <div className={styles.limitItem}>
          <FaCalendarAlt className={styles.limitIcon} />
          <span>
            {eventValue === -1 ? unlimited : eventValue ?? 0}{" "}
            {t("plansPage.planCard.events")}
          </span>
        </div>
        <div className={styles.limitItem}>
          <FaUsers className={styles.limitIcon} />
          <span>
            {inviteValue === -1 ? unlimited : (inviteValue ?? 0).toLocaleString()}{" "}
            {pool
              ? t("plansPage.planCard.invitesPool")
              : t("plansPage.planCard.invitesPerEvent")}
          </span>
        </div>
      </div>

      {featuresArray.length > 0 && (
        <div className={styles.planCardFeatures}>
          <ul className={styles.featuresList}>
            {featuresArray.map((feature, index) => (
              <li key={index} className={styles.featureItem}>
                <FaCheckCircle className={styles.featureIcon} />
                <span>{getLocalized(feature, "label", i18n.language)}</span>
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
