"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import styles from "../EditPlanPopup.module.css";

const PlanIdentityChips = ({ code, planType }) => {
  const { t } = useTranslation("admin");
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>
        {t("managePlans.editPopup.sections.identity")}
      </h3>
      <div className={styles.chipRow}>
        <div className={styles.chipField}>
          <span className={styles.chipLabel}>
            {t("managePlans.editPopup.fields.code.label")}
          </span>
          <span className={styles.chip}>{code || "—"}</span>
          <p className={styles.chipHelp}>
            {t("managePlans.editPopup.fields.code.help")}
          </p>
        </div>
        <div className={styles.chipField}>
          <span className={styles.chipLabel}>
            {t("managePlans.editPopup.fields.planType.label")}
          </span>
          <span className={styles.chip}>{planType || "—"}</span>
          <p className={styles.chipHelp}>
            {t("managePlans.editPopup.fields.planType.help")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlanIdentityChips;
