"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import FieldsSection from "./FieldsSection";
import OverlaysSection from "./OverlaysSection";
import TemplateIdentitySection from "./TemplateIdentitySection";
import TemplateDecorationsSection from "./TemplateDecorationsSection";
import styles from "./FieldConfigPanel.module.css";

export default function FieldConfigPanel({
  categories = [],
  fonts = [],
  fieldTypes,
  lang,
}) {
  const { t } = useTranslation("admin");

  return (
    <div className={styles.panel}>
      <TemplateIdentitySection categories={categories} lang={lang} />

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className={styles.sectionTitle}>{t("templates.panel.fields")}</h3>
        </div>
        <FieldsSection fieldTypes={fieldTypes} t={t} />
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M7 7H13M7 10H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className={styles.sectionTitle}>{t("templates.panel.overlays")}</h3>
        </div>
        <OverlaysSection fonts={fonts} t={t} />
      </section>

      <TemplateDecorationsSection />
    </div>
  );
}
