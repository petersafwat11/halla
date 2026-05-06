"use client";
import styles from "./WhitelabelDetailsWrapper.module.css";

export default function WlPlanSelection({ planSelection, t }) {
  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>{t("sections.planSelection", "Selected Plan")}</h2>
      <div className={styles.cardContent}>
        <div className={styles.infoRow}>
          <span className={styles.label}>{t("fields.plan", "Plan")}</span>
          <span className={styles.value}>
            {planSelection?.planCode === "pro" ? t("plans.pro", "Pro")
              : planSelection?.planCode === "elite" ? t("plans.elite", "Elite")
              : planSelection?.planCode || "-"}
          </span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>{t("fields.billingCycle", "Billing Cycle")}</span>
          <span className={styles.value}>
            {planSelection?.billingCycle === "yearly" ? t("billing.yearly", "Yearly")
              : planSelection?.billingCycle === "monthly" ? t("billing.monthly", "Monthly")
              : "-"}
          </span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>{t("fields.customBranding", "Custom Branding")}</span>
          <span className={styles.value}>
            {planSelection?.needsCustomBranding ? t("common.yes", "Yes") : t("common.no", "No")}
          </span>
        </div>
      </div>
    </div>
  );
}
