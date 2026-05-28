"use client";
import { FaCalendarAlt, FaUsers, FaCheckCircle, FaCrown, FaRocket } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { getLocalized } from "@/utils/locale";
import SarIcon from "@/ui/commen/SarIcon/SarIcon";
import styles from "../page.module.css";

const POOL_PLAN_TYPES = new Set([
  "business_quarterly",
  "business_annual",
  "basic_monthly",
  "premium_monthly",
  "unlimited",
]);

const isPoolPlan = (planType) => POOL_PLAN_TYPES.has(planType);

export default function CurrentPlanCard({ subscription, plans }) {
  const { t, i18n } = useTranslation("businessPlans");

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
  const planType = fullPlan?.planType || currentPlan?.planType;
  const pool = isPoolPlan(planType);
  const eventValue = displayLimits?.maxEvents;
  const inviteValue = pool
    ? displayLimits?.invitePool
    : displayLimits?.maxInvitesPerEvent;
  const pricePaid = subscription?.pricePaid?.amount ?? fullPlan?.pricing?.oneTime ?? 0;
  const unlimited = t("plansPage.currentPlan.unlimited");

  return (
    <div className={styles.currentPlanSection}>
      {hasActiveSubscription ? (
        <div className={styles.currentPlanCard}>
          <div className={styles.currentPlanHeader}>
            <div className={styles.planInfo}>
              <FaCrown className={styles.planIcon} />
              <span className={styles.planName}>
                {getLocalized(fullPlan, "name", i18n.language)}
              </span>
              <span className={styles.activeBadge}>
                {t("plansPage.currentPlan.badge")}
              </span>
            </div>
            <div className={styles.planPrice}>
              {new Intl.NumberFormat(i18n.language === "ar" ? "ar-SA" : "en-US", {
                minimumFractionDigits: 0,
              }).format(pricePaid)}
              <SarIcon size="1.5rem" style={{ marginInlineStart: "0.3em" }} />
            </div>
          </div>
          <div className={styles.currentPlanDetails}>
            <div className={styles.detailItem}>
              <FaCalendarAlt className={styles.detailIcon} />
              <span className={styles.detailLabel}>
                {t("plansPage.planCard.events")}
              </span>
              <span className={styles.detailValue}>
                {eventValue === -1 ? unlimited : eventValue ?? 0}
              </span>
            </div>
            <div className={styles.detailItem}>
              <FaUsers className={styles.detailIcon} />
              <span className={styles.detailLabel}>
                {pool
                  ? t("plansPage.planCard.invitesPool")
                  : t("plansPage.planCard.invitesPerEvent")}
              </span>
              <span className={styles.detailValue}>
                {inviteValue === -1
                  ? unlimited
                  : (inviteValue ?? 0).toLocaleString()}
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
                    i18n.language === "ar" ? "ar-SA" : "en-US"
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
