"use client";
import React from "react";
import styles from "./stepFive.module.css";
import { useTranslation } from "react-i18next";
import {
  FaCheck,
  FaStar,
  FaCrown,
  FaUsers,
  FaCalendarAlt,
} from "react-icons/fa";
import { getLocalized } from "@/utils/locale";

const PLAN_ICONS = {
  event: FaStar,
  quarterly: FaCrown,
  annual: FaCrown,
};

const PlanCard = ({ plan, type, isSelected, onSelect, limitLabel }) => {
  const { t, i18n } = useTranslation("signup");
  const IconComp = PLAN_ICONS[type] || FaStar;

  return (
    <div
      className={`${styles.planCard} ${isSelected ? styles.selected : ""} ${plan.isPopular ? styles.popular : ""}`}
      onClick={() => onSelect(plan.code)}
    >
      {isSelected && (
        <div className={styles.selectedCheck}>
          <FaCheck />
        </div>
      )}
      <div className={styles.planHeader}>
        <div className={styles.planIcon}>
          <IconComp />
        </div>
        <h3 className={styles.planName}>
          {getLocalized(plan, "name", i18n.language)}
        </h3>
      </div>
      <div className={styles.planPrice}>
        <span className={styles.priceAmount}>
          {(plan.pricing?.oneTime || 0).toLocaleString()}
        </span>
        <div className={styles.priceDetails}>
          <span className={styles.priceCurrency}>
            {t("signupForm.whiteLabel.planSelection.currency")}
          </span>
        </div>
      </div>
      <div className={styles.planLimits}>
        <div className={styles.limitItem}>
          <FaUsers className={styles.limitIcon} />
          <span>
            {type === "event"
              ? `${plan.limits?.maxInvitesPerEvent || 0} ${t("signupForm.whiteLabel.planSelection.invitesPerEvent")}`
              : `${(plan.limits?.invitePool || 0).toLocaleString()} ${t("signupForm.whiteLabel.planSelection.invitesPool")}`}
          </span>
        </div>
        <div className={styles.limitItem}>
          <FaCalendarAlt className={styles.limitIcon} />
          <span>{limitLabel}</span>
        </div>
      </div>
      <button
        type="button"
        className={`${styles.selectButton} ${isSelected ? styles.selectedBtn : ""}`}
      >
        {isSelected
          ? t("signupForm.whiteLabel.planSelection.selected")
          : t("signupForm.whiteLabel.planSelection.selectPlan")}
      </button>
    </div>
  );
};

export default PlanCard;
