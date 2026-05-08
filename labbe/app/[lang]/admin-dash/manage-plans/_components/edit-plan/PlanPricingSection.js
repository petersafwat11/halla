"use client";
import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import styles from "../EditPlanPopup.module.css";

const PlanPricingSection = () => {
  const { t } = useTranslation("admin");
  const {
    control,
    formState: { errors },
  } = useFormContext();

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>
        {t("managePlans.editPopup.sections.pricing")}
      </h3>
      <div className={styles.row}>
        <Controller
          name="pricing.oneTime"
          control={control}
          render={({ field }) => (
            <InputGroup
              label={t("managePlans.editPopup.fields.pricingOneTime.label")}
              placeholder={t(
                "managePlans.editPopup.fields.pricingOneTime.placeholder"
              )}
              hintMessage={
                errors.pricing?.oneTime?.message ||
                t("managePlans.editPopup.fields.pricingOneTime.help")
              }
              error={!!errors.pricing?.oneTime}
              type="number"
              name="pricing.oneTime"
              prefixText="SAR"
              value={field.value ?? 0}
              onChange={(e) => {
                const v = e.target.value;
                field.onChange(v === "" ? 0 : Number(v));
              }}
            />
          )}
        />
      </div>
    </div>
  );
};

export default PlanPricingSection;
