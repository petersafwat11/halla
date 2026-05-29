"use client";
/**
 * StepFour — Taqnyat picker + auto-replies (5-step wizard)
 *
 * Step 4 combines the Taqnyat-template picker (filtered by the category
 * locked in step 3) with the auto-replies editor below it.
 *
 * Saves the host's pick into:
 *   - selectedTemplate (legacy, for messaging.service compat)
 *   - taqnyatTemplate.templateRef (canonical)
 *
 * Auto-replies dual-write canonical guestReplies.* + legacy keys.
 */

import React, { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import styles from "./stepfour.module.css";
import { useHostTaqnyatTemplates } from "@/hooks/taqnyatTemplates";

const CheckIcon = () => (
  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
    <path d="M1 4.5L3.8 7.5L10 1" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const EnvelopeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path
      d="M3 7.5L10.7 12.6C11.5 13.1 12.5 13.1 13.3 12.6L21 7.5M5 19H19C20.1 19 21 18.1 21 17V7C21 5.9 20.1 5 19 5H5C3.9 5 3 5.9 3 7V17C3 18.1 3.9 19 5 19Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const REPLY_TABS = [
  {
    key: "attending",
    labelKey: "auto_replies_tab_attending",
    fallback: "الحضور",
    canonical: "onAttend",
    defaultKey: "auto_replies_default_attending",
    defaultText: "شكراً لتأكيد حضورك! يسعدنا أن تكون معنا في هذه المناسبة. سيصلك رمز الدخول الخاص بك قريباً. 🎉",
  },
  {
    key: "maybe",
    labelKey: "auto_replies_tab_maybe",
    fallback: "ربما",
    canonical: "onExpected",
    defaultKey: "auto_replies_default_maybe",
    defaultText: "شكراً لردّك! نأمل أن تتمكن من الحضور ونتطلع إلى رؤيتك بيننا. 🤍",
  },
  {
    key: "absence",
    labelKey: "auto_replies_tab_absence",
    fallback: "الاعتذار",
    canonical: "onAbsent",
    defaultKey: "auto_replies_default_absence",
    defaultText: "شكراً لإعلامنا. نتفهم ظروفك ونتمنى لك دوام الصحة والسعادة. 🌹",
  },
];

const StepFour = () => {
  const { setValue, watch } = useFormContext();
  const { t } = useTranslation("createEvent");
  const [activeTab, setActiveTab] = useState("attending");

  const visualTemplate = watch("visualTemplate");
  const selectedTemplate = watch("selectedTemplate");
  const guestReplies = watch("guestReplies") || {};

  const category = visualTemplate?.categories?.[0] || "";

  const { data, isLoading, error } = useHostTaqnyatTemplates(
    { category: category || undefined, type: "invite" },
    { enabled: true }
  );
  const templates = data?.data?.templates || [];

  useEffect(() => {
    REPLY_TABS.forEach((tab) => {
      const path = `guestReplies.${tab.canonical}`;
      if (!watch(path)) {
        setValue(path, t(tab.defaultKey, tab.defaultText), { shouldDirty: false });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTemplateSelect = (template) => {
    const enriched = {
      id: template._id,
      _id: template._id,
      name: template.templateName,
      templateName: template.templateName,
      language: template.language || "ar",
      hasImageHeader: template.hasImageHeader || false,
      bodyText: template.bodyText,
    };
    setValue("selectedTemplate", enriched, { shouldValidate: true });
    setValue("taqnyatTemplate", { templateRef: template._id }, { shouldValidate: false });
  };

  const activeReply = REPLY_TABS.find((tab) => tab.key === activeTab);
  const replyText = guestReplies?.[activeReply?.canonical];

  const handleReplyChange = (e) => {
    const value = e.target.value;
    if (!activeReply) return;
    setValue(`guestReplies.${activeReply.canonical}`, value, { shouldDirty: true });
  };

  return (
    <div className={styles.stepFour}>
      <div className={styles.formSection}>
        {/* ── Taqnyat template picker ──────────────────────────── */}
        <div className={styles.templateSection}>
          <div className={styles.templateHeader}>
            <label className={styles.sectionLabel}>
              {t("select_taqnyat_template", "اختر قالب الواتساب")}
            </label>
            {category && (
              <small className={styles.filterHint}>
                {t("filtered_by_category", "تم الفلترة حسب الفئة")}:{" "}
                <span className={styles.filterCategoryName}>
                  {t(`event_types.${category}`, category)}
                </span>
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
          ) : error ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>⚠</div>
              <p className={styles.emptyTitle}>
                {t("taqnyat_load_failed", "تعذّر تحميل القوالب")}
              </p>
              <p className={styles.emptyHint}>
                {t("try_again_later", "حاول مرة أخرى لاحقاً")}
              </p>
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
                const tplCategory = template.category || category;
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
                        <span className={styles.cardLabel}>
                          <span className={styles.cardLabelIcon} aria-hidden="true">
                            <EnvelopeIcon />
                          </span>
                          <span className={styles.cardLabelText}>
                            {tplCategory
                              ? t(`event_types.${tplCategory}`, tplCategory)
                              : t("invitation_message", "نص الدعوة")}
                          </span>
                        </span>
                      </div>
                      {template.bodyText && (
                        <div className={styles.bubbleWrap}>
                          <p className={styles.bubbleText}>{template.bodyText}</p>
                        </div>
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

        {/* ── Auto-replies ─────────────────────────────────────── */}
        <div className={styles.repliesSection}>
          <div className={styles.repliesHeader}>
            <label className={styles.sectionLabel}>
              {t("auto_replies", "الردود التلقائية")}
            </label>
            <p className={styles.repliesHint}>
              {t(
                "auto_replies_hint_editable",
                "تُرسل تلقائياً للضيف فور اختياره — يمكنك تعديل النص"
              )}
            </p>
          </div>

          <div className={styles.tabsWrapper}>
            {REPLY_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`${styles.tabBtn} ${activeTab === tab.key ? styles.tabBtnActive : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {t(tab.labelKey, tab.fallback)}
              </button>
            ))}
          </div>

          <textarea
            value={replyText || ""}
            onChange={handleReplyChange}
            rows={4}
            maxLength={500}
            className={styles.replyTextarea}
            placeholder={t("auto_reply_placeholder", "اكتب الرد التلقائي هنا")}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 8,
              border: "1px solid #ddd",
              fontFamily: "inherit",
              fontSize: 14,
              direction: "rtl",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default StepFour;
