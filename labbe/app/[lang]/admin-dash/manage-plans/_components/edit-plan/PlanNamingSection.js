"use client";
import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import styles from "../EditPlanPopup.module.css";

const PlanNamingSection = () => {
  const { t } = useTranslation("admin");
  const {
    control,
    formState: { errors },
  } = useFormContext();

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>
        {t("managePlans.editPopup.sections.naming")}
      </h3>
      <div className={styles.row}>
        <Controller
          name="nameAr"
          control={control}
          render={({ field }) => (
            <InputGroup
              label={t("managePlans.editPopup.fields.nameAr.label")}
              placeholder={t(
                "managePlans.editPopup.fields.nameAr.placeholder"
              )}
              type="text"
              name="nameAr"
              required
              hintMessage={errors.nameAr?.message}
              error={!!errors.nameAr}
              value={field.value ?? ""}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          name="nameEn"
          control={control}
          render={({ field }) => (
            <InputGroup
              label={t("managePlans.editPopup.fields.nameEn.label")}
              placeholder={t(
                "managePlans.editPopup.fields.nameEn.placeholder"
              )}
              type="text"
              name="nameEn"
              required
              hintMessage={errors.nameEn?.message}
              error={!!errors.nameEn}
              value={field.value ?? ""}
              onChange={field.onChange}
            />
          )}
        />
      </div>
    </div>
  );
};

export default PlanNamingSection;
