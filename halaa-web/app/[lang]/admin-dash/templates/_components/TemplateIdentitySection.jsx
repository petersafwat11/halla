"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import ToggleInput from "@/ui/commen/inputs/toggelInput/ToggelInput";
import CheckBoxItems from "@/ui/commen/inputs/checkboxItems/CheckBoxItems";
import styles from "./FieldConfigPanel.module.css";

export default function TemplateIdentitySection({ categories = [], lang }) {
  const { t } = useTranslation("admin");
  const {
    formState: { errors },
  } = useFormContext();

  const categoryOptions = categories.map((c) => ({
    label: lang === "ar" ? c.nameAr : c.nameEn,
    value: c.code,
  }));

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionIcon}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M14 2H6C4.89543 2 4 2.89543 4 4V16C4 17.1046 4.89543 18 6 18H14C15.1046 18 16 17.1046 16 16V4C16 2.89543 15.1046 2 14 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 6H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M8 10H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M8 14H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <h3 className={styles.sectionTitle}>{t("templates.panel.settings")}</h3>
      </div>

      <div className={styles.formGrid}>
        <InputGroup
          label={t("templates.panel.nameEn")}
          placeholder={t("templates.panel.nameEnPlaceholder", "Template name in English")}
          name="nameEn"
          required
        />
        <InputGroup
          label={t("templates.panel.nameAr")}
          placeholder={t("templates.panel.nameArPlaceholder", "اسم القالب بالعربية")}
          name="nameAr"
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.subsectionLabel}>
          {t("templates.panel.categories")}
        </label>
        <CheckBoxItems name="categories" items={categoryOptions} columns={2} />
        {errors.categories && (
          <p className={styles.fieldError}>{errors.categories.message}</p>
        )}
      </div>

      <div className={styles.formRow}>
        <div className={styles.formField}>
          <InputGroup
            label={t("templates.panel.sortOrder")}
            placeholder="0"
            name="sortOrder"
            type="number"
          />
        </div>
        <div className={styles.toggleField}>
          <ToggleInput
            name="active"
            label={t("templates.panel.active")}
            description={t(
              "templates.panel.activeDescription",
              "Enable or disable this template"
            )}
          />
        </div>
      </div>
    </section>
  );
}
