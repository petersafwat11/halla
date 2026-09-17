"use client";
import { useTranslation } from "react-i18next";
import {
  FaCalendarAlt,
  FaUsers,
  FaClock,
  FaRegCalendarTimes,
  FaGift,
  FaPaperPlane,
  FaLayerGroup,
  FaExchangeAlt,
} from "react-icons/fa";
import { getLocalized, formatNumber } from "@halaa/shared/utils/locale";
import {
  getInviteBreakdown,
  isTrialSubscription,
} from "@halaa/shared/utils/invitationBalance";
import styles from "./CurrentPlanCard.module.css";

// One icon per breakdown row key, so the row reads at a glance.
const BREAKDOWN_ICONS = {
  planInvites: <FaLayerGroup />,
  extraInvites: <FaPaperPlane />,
  compensationInvites: <FaGift />,
  carriedInvites: <FaExchangeAlt />,
};

/**
 * Current-subscription summary: which plan the host is on, where their
 * invites came from (plan / purchased extras / 15% compensation / carryover),
 * and how much of their allowance is left.
 */
const CurrentPlanCard = ({ subscription, usage }) => {
  const { t, i18n } = useTranslation("plans");
  const locale = i18n.language || "ar";

  // The free trial is not a purchased plan and must never render as one —
  // trial accounts see the same "no active plan" state as unsubscribed users
  // so they are steered to buy. Mirrors the mobile card.
  if (!subscription || isTrialSubscription(subscription)) {
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

  const planName = getLocalized(subscription, "planName", locale);

  const invitationBalance = subscription.invitationBalance;

  const eventsUsed = usage?.eventsCreated || 0;
  const eventsLimit = subscription.limits?.maxEvents ?? 0;
  const eventsUnlimited = eventsLimit === -1;

  const guestsUsed = invitationBalance?.consumed ?? 0;
  const guestsLimit = invitationBalance?.total ?? 0;
  const guestsUnlimited = invitationBalance?.unlimited === true;

  const daysRemaining =
    subscription.daysRemaining === -1 || subscription.daysRemaining == null
      ? null
      : Math.max(0, subscription.daysRemaining);

  const eventsPercent = eventsUnlimited
    ? 0
    : eventsLimit > 0
      ? (eventsUsed / eventsLimit) * 100
      : 0;
  const guestsPercent = guestsUnlimited || guestsLimit <= 0
    ? 0
    : (guestsUsed / guestsLimit) * 100;

  const breakdown = getInviteBreakdown(invitationBalance);
  // The note only explains the 15% row, so it is silent when there is none.
  const hasCompensation = breakdown.some((row) => row.key === "compensationInvites");
  const remaining = invitationBalance?.remaining;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h3 className={styles.title}>{t("currentPlan.title")}</h3>
          {planName ? <span className={styles.planName}>{planName}</span> : null}
        </div>
        {!guestsUnlimited && remaining != null ? (
          <div className={styles.remainingPill}>
            <span className={styles.remainingValue}>{formatNumber(remaining, locale)}</span>
            <span className={styles.remainingLabel}>
              {t("currentPlan.invitesRemaining")}
            </span>
          </div>
        ) : null}
      </div>

      {breakdown.length > 0 && (
        <div className={styles.breakdown}>
          <span className={styles.breakdownTitle}>{t("currentPlan.inviteBreakdown")}</span>
          <div className={styles.breakdownGrid}>
            {breakdown.map(({ key, value }) => (
              <div className={styles.breakdownItem} key={key}>
                <span className={styles.breakdownIcon} aria-hidden="true">
                  {BREAKDOWN_ICONS[key]}
                </span>
                <span className={styles.breakdownLabel}>{t(`currentPlan.${key}`)}</span>
                <span className={styles.breakdownValue}>{formatNumber(value, locale)}</span>
              </div>
            ))}
          </div>
          {hasCompensation && (
            <p className={styles.breakdownNote}>{t("currentPlan.compensationNote")}</p>
          )}
        </div>
      )}

      <div className={styles.usageGrid}>
        <UsageItem
          icon={<FaCalendarAlt />}
          label={t("currentPlan.events")}
          used={eventsUsed}
          limit={eventsLimit}
          percent={eventsPercent}
          isUnlimited={eventsUnlimited}
          locale={locale}
        />
        <UsageItem
          icon={<FaUsers />}
          label={t("currentPlan.invites")}
          used={guestsUsed}
          limit={guestsLimit}
          percent={guestsPercent}
          isUnlimited={guestsUnlimited}
          locale={locale}
        />
        <div className={styles.usageItem}>
          <div className={styles.usageIcon}>
            <FaClock />
          </div>
          <div className={styles.usageInfo}>
            <span className={styles.usageLabel}>{t("currentPlan.daysRemaining")}</span>
            <span className={styles.usageValue}>
              {daysRemaining == null
                ? t("currentPlan.noExpiry")
                : formatNumber(daysRemaining, locale)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const UsageItem = ({ icon, label, used, limit, percent, locale, isUnlimited = false }) => {
  const isNearLimit = !isUnlimited && percent >= 80;
  const isAtLimit = !isUnlimited && percent >= 100;

  return (
    <div className={styles.usageItem}>
      <div className={styles.usageIcon}>{icon}</div>
      <div className={styles.usageInfo}>
        <span className={styles.usageLabel}>{label}</span>
        <span className={`${styles.usageValue} ${isAtLimit ? styles.atLimit : isNearLimit ? styles.nearLimit : ""}`}>
          {isUnlimited
            ? `${formatNumber(used, locale)} / ∞`
            : `${formatNumber(used, locale)} / ${formatNumber(limit, locale)}`}
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
