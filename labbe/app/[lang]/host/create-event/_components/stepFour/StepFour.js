"use client";
/**
 * StepFour — Phase 4c W1-WIZARD-RENAME (D4c-1: Taqnyat picker step)
 *
 * Per the locked 6-step wizard structure:
 *   1 details / 2 guest+staff / 3 visual template / 4 Taqnyat picker /
 *   5 messaging+replies+note / 6 summary
 *
 * Step 4 is now the Taqnyat-template picker (filtered by the category
 * locked in step 3 via the visual template's `categories[]`). Reads
 * from the new backend cache `GET /api/v2/taqnyat-templates?category=`
 * — no more direct passthrough to Taqnyat at host wizard load time.
 *
 * Saves the host's pick into:
 *   - selectedTemplate (legacy, for messaging.service compat)
 *   - taqnyatTemplate.templateRef (canonical, used by W0-DYNAMIC
 *     resolver for {{N}} param resolution)
 */

import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import styles from "./stepfour.module.css";
import { useHostTaqnyatTemplates } from "@/hooks/queries/useTaqnyatTemplates";

const CheckIcon = () => (
  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
    <path d="M1 4.5L3.8 7.5L10 1" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const StepFour = () => {
  const { setValue, watch } = useFormContext();
  const { t } = useTranslation("createEvent");

  const visualTemplate = watch("visualTemplate");
  const selectedTemplate = watch("selectedTemplate");

  // Filter by the visual template's first category (D4c-1 — picker
  // narrows to the same category the host already picked in step 3).
  // If the visual template has no categories yet (mid-rename events),
  // fall back to the unfiltered list.
  const category = visualTemplate?.categories?.[0] || "";

  const { data, isLoading } = useHostTaqnyatTemplates(
    { category: category || undefined },
    { enabled: true }
  );
  const templates = data?.data?.templates || data?.templates || [];

  const handleTemplateSelect = (template) => {
    // Save under both legacy and canonical names so dual-write reads
    // resolve correctly.
    const enriched = {
      id: template._id,                      // legacy `selectedTemplate.id`
      _id: template._id,
      name: template.templateName,            // legacy `.name`
      templateName: template.templateName,
      language: template.language || "ar",
      hasImageHeader: template.hasImageHeader || false,
      bodyText: template.bodyText,
    };
    setValue("selectedTemplate", enriched, { shouldValidate: true });
    setValue("invitationSettings.selectedTemplate", enriched, { shouldValidate: false });
    setValue("taqnyatTemplate", { templateRef: template._id }, { shouldValidate: false });
    setValue("taqnyatTemplateRef", template._id, { shouldValidate: false });
  };

  return (
    <div className={styles.stepFour}>
      <div className={styles.formSection}>
        <div className={styles.templateSection}>
          <div className={styles.templateHeader}>
            <label className={styles.sectionLabel}>
              {t("select_taqnyat_template", "اختر قالب الواتساب")}
            </label>
            {category && (
              <small style={{ color: "#666" }}>
                {t("filtered_by_category", "تم الفلترة حسب الفئة")}: {category}
              </small>
            )}
          </div>

          {isLoading ? (
            <div className={styles.skeletonList}>
              {[0, 1, 2].map((i) => (
                <div key={i} className={styles.skeletonCard} style={{ animationDelay: `${i * 0.12}s` }}>
                  <div className={styles.skeletonRow}>
                    <div className={`${styles.skeletonPulse} ${styles.skeletonRadio}`} />
                    <div className={`${styles.skeletonPulse} ${styles.skeletonTitle}`} />
                  </div>
                  <div className={`${styles.skeletonPulse} ${styles.skeletonBody}`} />
                  <div className={`${styles.skeletonPulse} ${styles.skeletonBodyShort}`} />
                </div>
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>✉</div>
              <p className={styles.emptyTitle}>
                {t("no_taqnyat_templates", "لا توجد قوالب لهذه الفئة")}
              </p>
              <p className={styles.emptyHint}>
                {t("no_taqnyat_templates_hint", "تواصل مع الإدارة لتعيين قوالب لفئتك")}
              </p>
            </div>
          ) : (
            <div className={styles.templateList}>
              {templates.map((template, idx) => {
                const isSelected =
                  selectedTemplate?._id === template._id ||
                  selectedTemplate?.id === template._id ||
                  selectedTemplate?.name === template.templateName;
                return (
                  <button
                    key={template._id}
                    type="button"
                    className={`${styles.templateCard} ${isSelected ? styles.templateCardSelected : ""}`}
                    onClick={() => handleTemplateSelect(template)}
                    style={{ animationDelay: `${idx * 0.06}s` }}
                  >
                    <span className={`${styles.cardAccent} ${isSelected ? styles.cardAccentActive : ""}`} />
                    <div className={styles.cardBody}>
                      <div className={styles.cardTopRow}>
                        <span className={styles.templateName}>{template.templateName}</span>
                        <span className={`${styles.radioRing} ${isSelected ? styles.radioRingSelected : ""}`}>
                          {isSelected && <span className={styles.radioDot} />}
                        </span>
                      </div>
                      {template.bodyText && (
                        <div className={styles.bubbleWrap}>
                          <p className={styles.bubbleText}>{template.bodyText}</p>
                        </div>
                      )}
                      {template.varMapping?.length > 0 && (
                        <small style={{ color: "#666", marginTop: 6, display: "block" }}>
                          {t("vars_count", "متغيرات")}: {template.varMapping.length}
                        </small>
                      )}
                    </div>
                    {isSelected && (
                      <span className={styles.checkBadge}>
                        <CheckIcon />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StepFour;
