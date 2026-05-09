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

  // Pool plans (basic_monthly, premium_monthly, business_*) report `maxEvents: -1`
  // (unlimited events) and `maxInvitesPerEvent: null`; capacity is tracked on the
  // subscription itself via `invitePool` / `invitesConsumed`. Per-event plans use
  // `usage.guestsUsed` against the plan's `maxInvitesPerEvent`.
  const isPool = subscription.isPoolSubscription === true;

  const eventsUsed = usage?.eventsCreated || 0;
  const eventsLimit = subscription.limits?.maxEvents ?? 0;
  const eventsUnlimited = eventsLimit === -1;

  const guestsUsed = isPool
    ? (subscription.invitesConsumed ?? 0)
    : (usage?.guestsUsed ?? 0);
  const guestsLimit = isPool
    ? (subscription.invitePool ?? 0)
    : (subscription.limits?.maxInvitesPerEvent ?? 0);

  const daysRemaining = subscription.daysRemaining || 0;

  const eventsPercent = eventsUnlimited
    ? 0
    : eventsLimit > 0
      ? (eventsUsed / eventsLimit) * 100
      : 0;
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
          isUnlimited={eventsUnlimited}
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

const UsageItem = ({ icon, label, used, limit, percent, isUnlimited = false }) => {
  const isNearLimit = !isUnlimited && percent >= 80;
  const isAtLimit = !isUnlimited && percent >= 100;

  return (
    <div className={styles.usageItem}>
      <div className={styles.usageIcon}>{icon}</div>
      <div className={styles.usageInfo}>
        <span className={styles.usageLabel}>{label}</span>
        <span className={`${styles.usageValue} ${isAtLimit ? styles.atLimit : isNearLimit ? styles.nearLimit : ""}`}>
          {isUnlimited ? `${used} / ∞` : `${used} / ${limit}`}
        </span>
        {!isUnlimited && (
          <div className={styles.progressBar}>
            <div
              className={`${styles.progressFill} ${isAtLimit ? styles.atLimit : isNearLimit ? styles.nearLimit : ""}`}
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CurrentPlanCard;
