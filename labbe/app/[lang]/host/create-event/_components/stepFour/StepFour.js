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
import { useHostTaqnyatTemplates } from "@/hooks/queries/useTaqnyatTemplates";

const CheckIcon = () => (
  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
    <path d="M1 4.5L3.8 7.5L10 1" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AUTO_REPLIES_DEFAULTS = {
  attending:
    "شكراً لتأكيد حضورك! يسعدنا أن تكون معنا في هذه المناسبة. سيصلك رمز الدخول الخاص بك قريباً. 🎉",
  maybe: "شكراً لردّك! نأمل أن تتمكن من الحضور ونتطلع إلى رؤيتك بيننا. 🤍",
  absence: "شكراً لإعلامنا. نتفهم ظروفك ونتمنى لك دوام الصحة والسعادة. 🌹",
};

const REPLY_TABS = [
  { key: "attending", label: "الحضور", canonical: "onAttend", legacy: "attendanceAutoReply" },
  { key: "maybe", label: "ربما", canonical: "onExpected", legacy: "expectedAttendanceAutoReply" },
  { key: "absence", label: "الاعتذار", canonical: "onAbsent", legacy: "absenceAutoReply" },
];

const StepFour = () => {
  const { setValue, watch } = useFormContext();
  const { t } = useTranslation("createEvent");
  const [activeTab, setActiveTab] = useState("attending");

  const visualTemplate = watch("visualTemplate");
  const selectedTemplate = watch("selectedTemplate");
  const guestReplies = watch("guestReplies") || {};

  const category = visualTemplate?.categories?.[0] || "";

  const { data, isLoading } = useHostTaqnyatTemplates(
    { category: category || undefined },
    { enabled: true }
  );
  const templates = data?.data?.templates || data?.templates || [];

  useEffect(() => {
    if (!watch("guestReplies.onAttend")) {
      setValue("guestReplies.onAttend", AUTO_REPLIES_DEFAULTS.attending, { shouldDirty: false });
      setValue("attendanceAutoReply", AUTO_REPLIES_DEFAULTS.attending, { shouldDirty: false });
    }
    if (!watch("guestReplies.onAbsent")) {
      setValue("guestReplies.onAbsent", AUTO_REPLIES_DEFAULTS.absence, { shouldDirty: false });
      setValue("absenceAutoReply", AUTO_REPLIES_DEFAULTS.absence, { shouldDirty: false });
    }
    if (!watch("guestReplies.onExpected")) {
      setValue("guestReplies.onExpected", AUTO_REPLIES_DEFAULTS.maybe, { shouldDirty: false });
      setValue("expectedAttendanceAutoReply", AUTO_REPLIES_DEFAULTS.maybe, { shouldDirty: false });
    }
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
    setValue("invitationSettings.selectedTemplate", enriched, { shouldValidate: false });
    setValue("taqnyatTemplate", { templateRef: template._id }, { shouldValidate: false });
    setValue("taqnyatTemplateRef", template._id, { shouldValidate: false });
  };

  const activeReply = REPLY_TABS.find((tab) => tab.key === activeTab);
  const replyText = guestReplies?.[activeReply?.canonical];

  const handleReplyChange = (e) => {
    const value = e.target.value;
    if (!activeReply) return;
    setValue(`guestReplies.${activeReply.canonical}`, value, { shouldDirty: true });
    setValue(activeReply.legacy, value, { shouldDirty: true });
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
                {tab.label}
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
