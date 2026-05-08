"use client";
import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import ToggleInput from "@/ui/commen/inputs/toggelInput/ToggelInput";
import styles from "../EditPlanPopup.module.css";

const PlanDisplaySection = () => {
  const { t } = useTranslation("admin");
  const {
    control,
    formState: { errors },
  } = useFormContext();

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>
        {t("managePlans.editPopup.sections.display")}
      </h3>
      <ToggleInput
        name="isPopular"
        label={t("managePlans.editPopup.fields.isPopular.label")}
        description={t("managePlans.editPopup.fields.isPopular.description")}
      />
      <div className={styles.row}>
        <Controller
          name="sortOrder"
          control={control}
          render={({ field }) => (
            <InputGroup
              label={t("managePlans.editPopup.fields.sortOrder.label")}
              placeholder={t(
                "managePlans.editPopup.fields.sortOrder.placeholder"
              )}
              hintMessage={errors.sortOrder?.message}
              error={!!errors.sortOrder}
              type="number"
              name="sortOrder"
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

export default PlanDisplaySection;
