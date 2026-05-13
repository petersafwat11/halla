"use client";
import React, { useState } from "react";
import { useController, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import styles from "../EditPlanPopup.module.css";

const FEATURE_GROUPS = [
  {
    key: "invitations",
    keys: [
      "hasInAppInvites",
      "hasWhatsAppInvites",
      "hasSMSInvites",
      "hasCompensationInvites",
    ],
  },
  {
    key: "entry",
    keys: [
      "hasQRCode",
      "hasQRScanning",
      "hasFlexibleEntryMode",
      "hasStaffCheckIn",
      "hasStaffAssignment",
    ],
  },
  {
    key: "communication",
    keys: [
      "hasRSVPTracking",
      "hasAutoReminders",
      "hasEmailNotifications",
      "hasCustomWhatsAppNumber",
      "hasWhatsAppSupport",
    ],
  },
  {
    key: "content",
    keys: [
      "hasBasicTemplates",
      "hasPremiumTemplates",
      "hasPostEventPage",
      "hasCustomReports",
    ],
  },
];

const FeatureCheckbox = ({ name, label }) => {
  const { control } = useFormContext();
  const { field } = useController({ name, control });

  return (
    <label className={styles.checkboxCard}>
      <input
        type="checkbox"
        checked={!!field.value}
        onChange={(e) => field.onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
};

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
        <>
          {FEATURE_GROUPS.map((group) => (
            <div key={group.key} className={styles.featureGroup}>
              <h4 className={styles.sectionSubtitle}>
                {t(`admin:managePlans.editPopup.featureGroups.${group.key}`, {
                  defaultValue: group.key,
                })}
              </h4>
              <div className={styles.checkboxGrid}>
                {group.keys.map((key) => (
                  <FeatureCheckbox
                    key={key}
                    name={`features.${key}`}
                    label={t(`plans:features.${key}.label`, { defaultValue: key })}
                  />
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default PlanFeatureTogglesSection;
