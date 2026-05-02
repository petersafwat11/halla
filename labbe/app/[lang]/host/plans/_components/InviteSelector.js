"use client";
import { useTranslation } from "react-i18next";
import styles from "./GuestSelector.module.css";

const getOptionValue = (plan, billingType) => {
  if (billingType === "monthly") return plan.invitePool;
  return plan.invites || plan.limits?.maxInvitesPerEvent;
};

const InviteSelector = ({ plans = [], billingType = "event", selectedValue, onChange }) => {
  const { t } = useTranslation("plans");
  if (!plans.length) return null;
  return (
    <div className={styles.guestSelector}>
      <label className={styles.selectorLabel}>{t("inviteSelector.label")}</label>
      <div className={styles.guestOptions}>
        {plans.map((plan) => {
          const optionValue = getOptionValue(plan, billingType);
          return (
            <button
              key={plan.code}
              type="button"
              className={`${styles.guestOption} ${selectedValue === optionValue ? styles.active : ""}`}
              onClick={() => onChange(optionValue)}
            >
              <span className={styles.guestNumber}>{optionValue}</span>
              <span className={styles.guestLabel}>{t("inviteSelector.invites")}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default InviteSelector;
