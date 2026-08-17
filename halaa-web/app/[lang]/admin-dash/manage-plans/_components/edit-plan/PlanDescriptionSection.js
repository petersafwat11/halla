"use client";
import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import TextArea from "@/ui/commen/inputs/inputGroup/TextArea";
import styles from "../EditPlanPopup.module.css";

const PlanDescriptionSection = () => {
  const { t } = useTranslation("admin");
  const {
    control,
    formState: { errors },
  } = useFormContext();

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>
        {t("managePlans.editPopup.sections.description")}
      </h3>
      <div className={styles.row}>
        <Controller
          name="descriptionAr"
          control={control}
          render={({ field }) => (
            <TextArea
              label={t("managePlans.editPopup.fields.descriptionAr.label")}
              placeholder={t(
                "managePlans.editPopup.fields.descriptionAr.placeholder"
              )}
              name="descriptionAr"
              rows={3}
              hintMessage={errors.descriptionAr?.message}
              error={!!errors.descriptionAr}
              value={field.value ?? ""}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          name="descriptionEn"
          control={control}
          render={({ field }) => (
            <TextArea
              label={t("managePlans.editPopup.fields.descriptionEn.label")}
              placeholder={t(
                "managePlans.editPopup.fields.descriptionEn.placeholder"
              )}
              name="descriptionEn"
              rows={3}
              hintMessage={errors.descriptionEn?.message}
              error={!!errors.descriptionEn}
              value={field.value ?? ""}
              onChange={field.onChange}
            />
          )}
        />
      </div>
    </div>
  );
};

export default PlanDescriptionSection;
