"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import ToggleInput from "@/ui/commen/inputs/toggelInput/ToggelInput";
import styles from "../EditPlanPopup.module.css";

const FEATURE_TOGGLE_KEYS = [
  "hasInAppInvites",
  "hasWhatsAppInvites",
  "hasSMSInvites",
  "hasQRCode",
  "hasQRScanning",
  "hasFlexibleEntryMode",
  "hasStaffCheckIn",
  "hasStaffAssignment",
  "hasRSVPTracking",
  "hasAutoReminders",
  "hasEmailNotifications",
  "hasCustomWhatsAppNumber",
  "hasCompensationInvites",
  "hasBasicTemplates",
  "hasPremiumTemplates",
  "hasPostEventPage",
  "hasCustomReports",
  "hasWhatsAppSupport",
];

const PlanFeatureTogglesSection = () => {
  const { t } = useTranslation(["admin", "plans"]);
  const [open, setOpen] = useState(true);

  return (
    <div className={styles.section}>
      <button
        type="button"
        className={styles.collapsibleHeader}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <h3 className={styles.sectionTitle}>
          {t("admin:managePlans.editPopup.sections.featureToggles")}
        </h3>
        <span
          className={`${styles.collapsibleChevron} ${
            open ? styles.collapsibleChevronOpen : ""
          }`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>
      {open && (
        <div className={styles.togglesGrid}>
          {FEATURE_TOGGLE_KEYS.map((key) => (
            <ToggleInput
              key={key}
              name={`features.${key}`}
              label={t(`plans:features.${key}.label`, { defaultValue: key })}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PlanFeatureTogglesSection;
