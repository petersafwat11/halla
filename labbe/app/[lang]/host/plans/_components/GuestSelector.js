"use client";
import { useTranslation } from "react-i18next";
import styles from "./GuestSelector.module.css";

/**
 * Guest count selector for single event plans
 */
const GuestSelector = ({ plans = [], selectedGuests, onChange }) => {
  const { t } = useTranslation("plans");

  if (!plans.length) return null;

  return (
    <div className={styles.guestSelector}>
      <label className={styles.selectorLabel}>{t("guestSelector.label")}</label>
      <div className={styles.guestOptions}>
        {plans.map((plan) => (
          <button
            key={plan.code}
            type="button"
            className={`${styles.guestOption} ${selectedGuests === plan.guests ? styles.active : ""}`}
            onClick={() => onChange(plan.guests)}
          >
            <span className={styles.guestNumber}>{plan.guests}</span>
            <span className={styles.guestLabel}>{t("guestSelector.guests")}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default GuestSelector;
