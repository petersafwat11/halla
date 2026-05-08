"use client";
import { useTranslation } from "react-i18next";
import { FaCalendarAlt, FaUsers, FaClock, FaRegCalendarTimes } from "react-icons/fa";
import { getLocalized } from "@/utils/locale";
import styles from "./CurrentPlanCard.module.css";

/**
 * Displays current subscription summary with usage stats
 */
const CurrentPlanCard = ({ subscription, usage }) => {
  const { t, i18n } = useTranslation("plans");

  if (!subscription) {
    return (
      <div className={styles.noSubCard}>
        <div className={styles.noSubIcon}>
          <FaRegCalendarTimes />
        </div>
        <div className={styles.noSubText}>
          <span className={styles.noSubTitle}>{t("noActiveSubscription.title")}</span>
          <span className={styles.noSubSubtitle}>{t("noActiveSubscription.subtitle")}</span>
        </div>
      </div>
    );
  }

  const planName =
    getLocalized(subscription, "planName", i18n.language) ||
    subscription.planName;

  const eventsUsed = usage?.eventsUsed || 0;
  const eventsLimit = usage?.eventsLimit || subscription.limits?.maxEvents || 0;
  const guestsUsed = usage?.guestsUsed || 0;
  const guestsLimit = usage?.guestsLimit || subscription.limits?.maxInvitesPerEvent || 0;
  const daysRemaining = subscription.daysRemaining || 0;

  const eventsPercent = eventsLimit > 0 ? (eventsUsed / eventsLimit) * 100 : 0;
  const guestsPercent = guestsLimit > 0 ? (guestsUsed / guestsLimit) * 100 : 0;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>{t("currentPlan.title")}</h3>
        <span className={styles.planName}>{planName}</span>
      </div>

      <div className={styles.usageGrid}>
        <UsageItem
          icon={<FaCalendarAlt />}
          label={t("currentPlan.events")}
          used={eventsUsed}
          limit={eventsLimit}
          percent={eventsPercent}
        />
        <UsageItem
          icon={<FaUsers />}
          label={t("currentPlan.invites")}
          used={guestsUsed}
          limit={guestsLimit}
          percent={guestsPercent}
        />
        <div className={styles.usageItem}>
          <div className={styles.usageIcon}>
            <FaClock />
          </div>
          <div className={styles.usageInfo}>
            <span className={styles.usageLabel}>{t("currentPlan.daysRemaining")}</span>
            <span className={styles.usageValue}>{daysRemaining}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const UsageItem = ({ icon, label, used, limit, percent }) => {
  const isNearLimit = percent >= 80;
  const isAtLimit = percent >= 100;

  return (
    <div className={styles.usageItem}>
      <div className={styles.usageIcon}>{icon}</div>
      <div className={styles.usageInfo}>
        <span className={styles.usageLabel}>{label}</span>
        <span className={`${styles.usageValue} ${isAtLimit ? styles.atLimit : isNearLimit ? styles.nearLimit : ""}`}>
          {used} / {limit}
        </span>
        <div className={styles.progressBar}>
          <div
            className={`${styles.progressFill} ${isAtLimit ? styles.atLimit : isNearLimit ? styles.nearLimit : ""}`}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default CurrentPlanCard;
