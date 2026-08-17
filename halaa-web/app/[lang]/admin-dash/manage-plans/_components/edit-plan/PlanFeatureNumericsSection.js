"use client";
import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import styles from "../EditPlanPopup.module.css";

const PlanFeatureNumericsSection = () => {
  const { t } = useTranslation("admin");
  const {
    control,
    formState: { errors },
  } = useFormContext();

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>
        {t("managePlans.editPopup.sections.featureNumerics")}
      </h3>
      <div className={styles.row}>
        <Controller
          name="features.whatsAppTemplates"
          control={control}
          render={({ field }) => (
            <InputGroup
              label={t("managePlans.editPopup.fields.whatsAppTemplates.label")}
              placeholder={t("managePlans.editPopup.fields.whatsAppTemplates.placeholder")}
              hintMessage={
                errors.features?.whatsAppTemplates?.message ||
                t("managePlans.editPopup.fields.whatsAppTemplates.help")
              }
              error={!!errors.features?.whatsAppTemplates}
              type="number"
              name="features.whatsAppTemplates"
              value={field.value ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                field.onChange(v === "" ? undefined : Number(v));
              }}
            />
          )}
        />
        <Controller
          name="setupFeeAmount"
          control={control}
          render={({ field }) => (
            <InputGroup
              label={t("managePlans.editPopup.fields.setupFeeAmount.label")}
              placeholder={t("managePlans.editPopup.fields.setupFeeAmount.placeholder")}
              hintMessage={
                errors.setupFeeAmount?.message ||
                t("managePlans.editPopup.fields.setupFeeAmount.help")
              }
              error={!!errors.setupFeeAmount}
              type="number"
              name="setupFeeAmount"
              value={field.value ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                field.onChange(v === "" ? undefined : Number(v));
              }}
            />
          )}
        />
      </div>
    </div>
  );
};

export default PlanFeatureNumericsSection;
