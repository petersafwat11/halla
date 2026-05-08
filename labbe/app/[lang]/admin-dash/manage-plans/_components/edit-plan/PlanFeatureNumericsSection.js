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
          name="features.compensationPercentage"
          control={control}
          render={({ field }) => (
            <InputGroup
              label={t(
                "managePlans.editPopup.fields.compensationPercentage.label"
              )}
              placeholder={t(
                "managePlans.editPopup.fields.compensationPercentage.placeholder"
              )}
              hintMessage={
                errors.features?.compensationPercentage?.message ||
                t("managePlans.editPopup.fields.compensationPercentage.help")
              }
              error={!!errors.features?.compensationPercentage}
              type="number"
              name="features.compensationPercentage"
              prefixText="%"
              value={field.value ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                field.onChange(v === "" ? undefined : Number(v));
              }}
            />
          )}
        />
        <Controller
          name="features.priorityPoints"
          control={control}
          render={({ field }) => (
            <InputGroup
              label={t("managePlans.editPopup.fields.priorityPoints.label")}
              placeholder={t(
                "managePlans.editPopup.fields.priorityPoints.placeholder"
              )}
              hintMessage={
                errors.features?.priorityPoints?.message ||
                t("managePlans.editPopup.fields.priorityPoints.help")
              }
              error={!!errors.features?.priorityPoints}
              type="number"
              name="features.priorityPoints"
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
