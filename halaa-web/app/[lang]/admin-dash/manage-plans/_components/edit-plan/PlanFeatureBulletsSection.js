"use client";
import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import styles from "../EditPlanPopup.module.css";

// Multi-line textarea where each line becomes one bullet. Trims trailing
// whitespace and drops empty lines on save.
const bulletsArrayToText = (arr) => (Array.isArray(arr) ? arr.join("\n") : "");
const bulletsTextToArray = (text) =>
  (text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

const PlanFeatureBulletsSection = () => {
  const { t } = useTranslation("admin");
  const {
    control,
    formState: { errors },
  } = useFormContext();

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>
        {t("managePlans.editPopup.sections.featureBullets")}
      </h3>

      <Controller
        name="featureBullets.ar"
        control={control}
        render={({ field }) => (
          <div className={styles.bulletField}>
            <label className={styles.bulletLabel}>
              {t("managePlans.editPopup.fields.featureBulletsAr.label")}
            </label>
            <textarea
              className={styles.bulletTextarea}
              dir="rtl"
              rows={8}
              placeholder={t(
                "managePlans.editPopup.fields.featureBulletsAr.placeholder"
              )}
              value={bulletsArrayToText(field.value)}
              onChange={(e) => field.onChange(bulletsTextToArray(e.target.value))}
            />
            <span className={styles.bulletHint}>
              {errors.featureBullets?.ar?.message ||
                t("managePlans.editPopup.fields.featureBulletsAr.help")}
            </span>
          </div>
        )}
      />

      <Controller
        name="featureBullets.en"
        control={control}
        render={({ field }) => (
          <div className={styles.bulletField}>
            <label className={styles.bulletLabel}>
              {t("managePlans.editPopup.fields.featureBulletsEn.label")}
            </label>
            <textarea
              className={styles.bulletTextarea}
              dir="ltr"
              rows={8}
              placeholder={t(
                "managePlans.editPopup.fields.featureBulletsEn.placeholder"
              )}
              value={bulletsArrayToText(field.value)}
              onChange={(e) => field.onChange(bulletsTextToArray(e.target.value))}
            />
            <span className={styles.bulletHint}>
              {errors.featureBullets?.en?.message ||
                t("managePlans.editPopup.fields.featureBulletsEn.help")}
            </span>
          </div>
        )}
      />
    </div>
  );
};

export default PlanFeatureBulletsSection;
