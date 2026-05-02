"use client";
import React from "react";
import { useRouter } from "next/navigation";
import styles from "./UpgradePromptModal.module.css";
import useLanguageChange from "@/hooks/UseLanguageChange";

/**
 * UpgradePromptModal Component
 *
 * Modal that shows when package limits are reached
 * Displays current plan vs recommended plan with pricing comparison
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Callback to close modal
 * @param {Object} props.currentPlan - Current plan details
 * @param {Object} props.suggestedPlan - Suggested upgrade plan
 * @param {string} props.limitType - Type of limit reached: 'events', 'guests', 'moderators'
 * @param {Object} props.usage - Current usage statistics
 * @param {string} props.message - Custom message to display
 */
const UpgradePromptModal = ({
  isOpen = false,
  onClose,
  currentPlan = null,
  suggestedPlan = null,
  limitType = "events",
  usage = {},
  message = null,
}) => {
  const router = useRouter();
  const { currentLocale } = useLanguageChange();

  if (!isOpen) return null;

  const handleUpgrade = () => {
    router.push(`/${currentLocale}/host/plans`);
    onClose?.();
  };

  const getLimitLabel = () => {
    switch (limitType) {
      case "events":
        return currentLocale === "ar" ? "الفعاليات" : "Events";
      case "guests":
        return currentLocale === "ar" ? "الضيوف" : "Guests";
      case "moderators":
        return currentLocale === "ar" ? "المشرفين" : "Moderators";
      default:
        return currentLocale === "ar" ? "الحد" : "Limit";
    }
  };

  const getDefaultMessage = () => {
    if (message) return message;

    const limitLabel = getLimitLabel();
    if (currentLocale === "ar") {
      return `لقد وصلت إلى الحد الأقصى لـ ${limitLabel}. قم بالترقية للمتابعة.`;
    }
    return `You've reached your ${limitLabel.toLowerCase()} limit. Upgrade to continue.`;
  };

  const renderPlanComparison = () => {
    if (!currentPlan || !suggestedPlan) return null;

    return (
      <div className={styles.comparison_container}>
        <div className={styles.plan_card}>
          <div className={styles.plan_header}>
            <h4 className={styles.plan_title}>
              {currentLocale === "ar" ? "الباقة الحالية" : "Current Plan"}
            </h4>
            <span className={styles.plan_badge_current}>
              {currentLocale === "ar" ? "حالي" : "Current"}
            </span>
          </div>
          <div className={styles.plan_name}>{currentPlan.name}</div>
          <div className={styles.plan_price}>
            {currentPlan.price} {currentLocale === "ar" ? "ر.س" : "SAR"}
            <span className={styles.price_period}>
              /{currentLocale === "ar" ? "شهر" : "month"}
            </span>
          </div>
          <div className={styles.plan_features}>
            <div className={styles.feature_item}>
              <span className={styles.feature_icon}>📅</span>
              <span>
                {currentPlan.eventsLimit}{" "}
                {currentLocale === "ar" ? "فعالية" : "events"}
              </span>
            </div>
            <div className={styles.feature_item}>
              <span className={styles.feature_icon}>👥</span>
              <span>
                {currentPlan.guestsLimit}{" "}
                {currentLocale === "ar" ? "ضيف" : "guests"}
              </span>
            </div>
            {currentPlan.moderatorsLimit && (
              <div className={styles.feature_item}>
                <span className={styles.feature_icon}>👤</span>
                <span>
                  {currentPlan.moderatorsLimit}{" "}
                  {currentLocale === "ar" ? "مشرف" : "moderators"}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className={styles.arrow_container}>
          <svg
            className={styles.arrow_icon}
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5 12H19M19 12L12 5M19 12L12 19"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className={`${styles.plan_card} ${styles.plan_card_suggested}`}>
          <div className={styles.plan_header}>
            <h4 className={styles.plan_title}>
              {currentLocale === "ar" ? "الباقة المقترحة" : "Recommended Plan"}
            </h4>
            <span className={styles.plan_badge_recommended}>
              {currentLocale === "ar" ? "موصى به" : "Recommended"}
            </span>
          </div>
          <div className={styles.plan_name}>{suggestedPlan.name}</div>
          <div className={styles.plan_price}>
            {suggestedPlan.price} {currentLocale === "ar" ? "ر.س" : "SAR"}
            <span className={styles.price_period}>
              /{currentLocale === "ar" ? "شهر" : "month"}
            </span>
          </div>
          <div className={styles.plan_features}>
            <div className={styles.feature_item}>
              <span className={styles.feature_icon}>📅</span>
              <span>
                {suggestedPlan.eventsLimit}{" "}
                {currentLocale === "ar" ? "فعالية" : "events"}
              </span>
            </div>
            <div className={styles.feature_item}>
              <span className={styles.feature_icon}>👥</span>
              <span>
                {suggestedPlan.guestsLimit}{" "}
                {currentLocale === "ar" ? "ضيف" : "guests"}
              </span>
            </div>
            {suggestedPlan.moderatorsLimit && (
              <div className={styles.feature_item}>
                <span className={styles.feature_icon}>👤</span>
                <span>
                  {suggestedPlan.moderatorsLimit}{" "}
                  {currentLocale === "ar" ? "مشرف" : "moderators"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.modal_overlay} onClick={onClose}>
      <div
        className={styles.modal_container}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles.close_button}
          onClick={onClose}
          aria-label="Close"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18 6L6 18M6 6L18 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className={styles.modal_content}>
          <div className={styles.modal_header}>
            <div className={styles.icon_container}>
              <svg
                className={styles.warning_icon}
                width="48"
                height="48"
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="24" cy="24" r="24" fill="#FEF3C7" />
                <path
                  d="M24 16V26M24 32H24.02"
                  stroke="#F59E0B"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 className={styles.modal_title}>
              {currentLocale === "ar"
                ? "وصلت إلى الحد الأقصى"
                : "Limit Reached"}
            </h2>
            <p className={styles.modal_message}>{getDefaultMessage()}</p>
          </div>

          {renderPlanComparison()}

          <div className={styles.modal_actions}>
            <button
              type="button"
              className={styles.button_secondary}
              onClick={onClose}
            >
              {currentLocale === "ar" ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="button"
              className={styles.button_primary}
              onClick={handleUpgrade}
            >
              <svg
                className={styles.button_icon}
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10 15V5M10 5L5 10M10 5L15 10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {currentLocale === "ar" ? "ترقية الباقة" : "Upgrade Plan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradePromptModal;
