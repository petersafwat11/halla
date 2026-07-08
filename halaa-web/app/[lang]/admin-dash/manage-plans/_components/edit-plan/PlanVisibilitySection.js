"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import ToggleInput from "@/ui/commen/inputs/toggelInput/ToggelInput";
import styles from "../EditPlanPopup.module.css";

const PlanVisibilitySection = () => {
  const { t } = useTranslation("admin");

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>
        {t("managePlans.editPopup.sections.visibility")}
      </h3>
      <ToggleInput
        name="isActive"
        label={t("managePlans.editPopup.fields.isActive.label")}
        description={t("managePlans.editPopup.fields.isActive.description")}
      />
      <ToggleInput
        name="isPublic"
        label={t("managePlans.editPopup.fields.isPublic.label")}
        description={t("managePlans.editPopup.fields.isPublic.description")}
      />
    </div>
  );
};

export default PlanVisibilitySection;
