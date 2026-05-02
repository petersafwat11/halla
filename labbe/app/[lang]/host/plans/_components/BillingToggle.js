"use client";
import { useTranslation } from "react-i18next";
import styles from "./BillingToggle.module.css";

/**
 * Toggle between monthly and yearly billing
 */
const BillingToggle = ({ value, onChange }) => {
  const { t } = useTranslation("plans");

  return (
    <div className={styles.billingToggle}>
      <button
        type="button"
        className={`${styles.billingOption} ${value === "monthly" ? styles.active : ""}`}
        onClick={() => onChange("monthly")}
      >
        {t("billingCycle.monthly")}
      </button>
      <button
        type="button"
        className={`${styles.billingOption} ${value === "yearly" ? styles.active : ""}`}
        onClick={() => onChange("yearly")}
      >
        {t("billingCycle.yearly")}
        <span className={styles.saveBadge}>{t("billingCycle.saveBadge")}</span>
      </button>
    </div>
  );
};

export default BillingToggle;
