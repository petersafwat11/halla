"use client";
import React from "react";
import styles from "./PackageLimitWarning.module.css";

/**
 * PackageLimitWarning Component
 *
 * Displays current usage vs limits with progress bars and warnings
 * Shows upgrade button when approaching or exceeding limits
 *
 * @param {Object} props
 * @param {Object} props.usage - Usage statistics object
 * @param {number} props.usage.eventsUsed - Number of events used
 * @param {number} props.usage.eventsLimit - Maximum events allowed
 * @param {number} props.usage.guestsUsed - Number of guests used
 * @param {number} props.usage.guestsLimit - Maximum guests allowed
 * @param {number} props.usage.moderatorsUsed - Number of moderators used
 * @param {number} props.usage.moderatorsLimit - Maximum moderators allowed
 * @param {string} props.type - Type of limit to display: 'events', 'guests', 'moderators', 'all'
 * @param {Function} props.onUpgrade - Callback when upgrade button is clicked
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.showUpgradeButton - Whether to show upgrade button
 */
const PackageLimitWarning = ({
  usage = {},
  type = "all",
  onUpgrade = null,
  className = "",
  showUpgradeButton = true,
}) => {
  if (!usage) return null;

  const getProgressPercentage = (used, limit) => {
    if (!limit || limit === 0) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return styles.progress_exceeded;
    if (percentage >= 80) return styles.progress_warning;
    if (percentage >= 60) return styles.progress_caution;
    return styles.progress_normal;
  };

  const isLimitReached = (used, limit) => {
    return used >= limit;
  };

  const isApproachingLimit = (used, limit) => {
    const percentage = getProgressPercentage(used, limit);
    return percentage >= 80 && percentage < 100;
  };

  const renderLimitItem = (label, used, limit, icon) => {
    const percentage = getProgressPercentage(used, limit);
    const progressColor = getProgressColor(percentage);
    const limitReached = isLimitReached(used, limit);
    const approaching = isApproachingLimit(used, limit);

    return (
      <div className={styles.limit_item}>
        <div className={styles.limit_header}>
          <div className={styles.limit_label}>
            {icon && <span className={styles.limit_icon}>{icon}</span>}
            <span className={styles.limit_text}>{label}</span>
          </div>
          <div className={styles.limit_count}>
            <span className={limitReached ? styles.count_exceeded : ""}>
              {used}
            </span>
            <span className={styles.count_separator}>/</span>
            <span className={styles.count_limit}>{limit}</span>
          </div>
        </div>
        <div className={styles.progress_container}>
          <div className={`${styles.progress_bar} ${progressColor}`}>
            <div
              className={styles.progress_fill}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
        {limitReached && (
          <div className={styles.limit_message_exceeded}>
            Limit reached! Upgrade to continue.
          </div>
        )}
        {approaching && !limitReached && (
          <div className={styles.limit_message_warning}>
            Approaching limit. Consider upgrading.
          </div>
        )}
      </div>
    );
  };

  const shouldShowWarning = () => {
    if (type === "events" && usage.eventsLimit) {
      return getProgressPercentage(usage.eventsUsed, usage.eventsLimit) >= 60;
    }
    if (type === "guests" && usage.guestsLimit) {
      return getProgressPercentage(usage.guestsUsed, usage.guestsLimit) >= 60;
    }
    if (type === "moderators" && usage.moderatorsLimit) {
      return (
        getProgressPercentage(usage.moderatorsUsed, usage.moderatorsLimit) >= 60
      );
    }
    if (type === "all") {
      return (
        (usage.eventsLimit &&
          getProgressPercentage(usage.eventsUsed, usage.eventsLimit) >= 60) ||
        (usage.guestsLimit &&
          getProgressPercentage(usage.guestsUsed, usage.guestsLimit) >= 60) ||
        (usage.moderatorsLimit &&
          getProgressPercentage(usage.moderatorsUsed, usage.moderatorsLimit) >=
            60)
      );
    }
    return false;
  };

  if (!shouldShowWarning()) return null;

  return (
    <div className={`${styles.warning_container} ${className}`}>
      <div className={styles.warning_content}>
        <div className={styles.limits_list}>
          {(type === "events" || type === "all") &&
            usage.eventsLimit &&
            renderLimitItem(
              "Events",
              usage.eventsUsed || 0,
              usage.eventsLimit,
              "📅",
            )}
          {(type === "guests" || type === "all") &&
            usage.guestsLimit &&
            renderLimitItem(
              "Guests",
              usage.guestsUsed || 0,
              usage.guestsLimit,
              "👥",
            )}
          {(type === "moderators" || type === "all") &&
            usage.moderatorsLimit &&
            renderLimitItem(
              "Moderators",
              usage.moderatorsUsed || 0,
              usage.moderatorsLimit,
              "👤",
            )}
        </div>
        {showUpgradeButton && onUpgrade && (
          <button
            type="button"
            onClick={onUpgrade}
            className={styles.upgrade_button}
          >
            <svg
              className={styles.upgrade_icon}
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8 12V4M8 4L4 8M8 4L12 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Upgrade Plan
          </button>
        )}
      </div>
    </div>
  );
};

export default PackageLimitWarning;
