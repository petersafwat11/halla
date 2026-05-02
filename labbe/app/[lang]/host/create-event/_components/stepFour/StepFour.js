"use client";
import React, { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import styles from "./stepfour.module.css";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";

const AUTO_REPLIES = {
  attending:
    "شكراً لتأكيد حضورك! يسعدنا أن تكون معنا في هذه المناسبة. سيصلك رمز الدخول الخاص بك قريباً. 🎉",
  maybe:
    "شكراً لردّك! نأمل أن تتمكن من الحضور ونتطلع إلى رؤيتك بيننا. 🤍",
  absence:
    "شكراً لإعلامنا. نتفهم ظروفك ونتمنى لك دوام الصحة والسعادة. 🌹",
};

const REPLY_TABS = [
  { key: "attending", label: "الحضور" },
  { key: "maybe", label: "ربما" },
  { key: "absence", label: "الاعتذار" },
];

const CheckIcon = () => (
  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
    <path
      d="M1 4.5L3.8 7.5L10 1"
      stroke="white"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);


const StepFour = () => {
  const { setValue, watch } = useFormContext();
  const { t } = useTranslation("createEvent");
  const [activeReplyTab, setActiveReplyTab] = useState("attending");

  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ["messaging", "templates", "approved"],
    queryFn: () =>
      apiRequest({ method: "GET", path: API_PATHS.invitations.getApprovedTemplates }),
    staleTime: 5 * 60 * 1000,
  });

  const templates = templatesData?.templates || templatesData?.data?.templates || [];
  const selectedTemplate = watch("selectedTemplate");

  useEffect(() => {
    setValue("attendanceAutoReply", AUTO_REPLIES.attending, { shouldDirty: false });
    setValue("absenceAutoReply", AUTO_REPLIES.absence, { shouldDirty: false });
    setValue("expectedAttendanceAutoReply", AUTO_REPLIES.maybe, { shouldDirty: false });
  }, [setValue]);

  const handleTemplateSelect = (template) => {
    setValue("selectedTemplate", template, { shouldValidate: true });
  };


  return (
    <div className={styles.stepFour}>
      <div className={styles.formSection}>

        {/* ── Template Selector ──────────────────────────── */}
        <div className={styles.templateSection}>
          <div className={styles.templateHeader}>
            <label className={styles.sectionLabel}>
              {t("select_template_label", "اختر قالب الرسالة")}
            </label>
          </div>

          {templatesLoading ? (
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
                {t("no_templates", "لا توجد قوالب معتمدة حالياً")}
              </p>
              <p className={styles.emptyHint}>تواصل مع الدعم لإضافة قوالب جديدة</p>
            </div>
          ) : (
            <div className={styles.templateList}>
              {templates.map((template, idx) => {
                const isSelected = selectedTemplate?.name === template.name;
                return (
                  <button
                    key={template.id || template.name}
                    type="button"
                    className={`${styles.templateCard} ${isSelected ? styles.templateCardSelected : ""}`}
                    onClick={() => handleTemplateSelect(template)}
                    style={{ animationDelay: `${idx * 0.06}s` }}
                  >
                    {/* Gold accent bar */}
                    <span className={`${styles.cardAccent} ${isSelected ? styles.cardAccentActive : ""}`} />

                    <div className={styles.cardBody}>
                      {/* Top row: radio + name */}
                      <div className={styles.cardTopRow}>
                        <span className={styles.templateName}>{template.name}</span>
                        <span className={`${styles.radioRing} ${isSelected ? styles.radioRingSelected : ""}`}>
                          {isSelected && <span className={styles.radioDot} />}
                        </span>
                      </div>

                      {/* Message bubble */}
                      {template.bodyText && (
                        <div className={styles.bubbleWrap}>
                          <p className={styles.bubbleText}>{template.bodyText}</p>
                        </div>
                      )}
                    </div>

                    {/* Selected checkmark badge */}
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

        {/* ── Auto-reply Section ─────────────────────────── */}
        <div className={styles.repliesSection}>
          <div className={styles.repliesHeader}>
            <label className={styles.sectionLabel}>
              {t("auto_replies", "الردود التلقائية")}
            </label>
            <p className={styles.repliesHint}>
              {t(
                "auto_replies_hint",
                "تُرسل هذه الرسائل تلقائياً للضيف فور اختياره — غير قابلة للتعديل"
              )}
            </p>
          </div>

          {/* Pill tabs */}
          <div className={styles.tabsWrapper}>
            {REPLY_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`${styles.tabBtn} ${activeReplyTab === tab.key ? styles.tabBtnActive : ""}`}
                onClick={() => setActiveReplyTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Reply bubble */}
          <div className={styles.replyBubbleWrap} key={activeReplyTab}>
            <div className={styles.replyBubble}>
              <p className={styles.replyText}>{AUTO_REPLIES[activeReplyTab]}</p>
            </div>
          </div>
        </div>

        {/* ── Optional Note ──────────────────────────────── */}
        <div className={styles.optionalField}>
          <div className={styles.labelWithOptional}>
            <span className={styles.optionalText}>{t("optional", "(اختياري)")}</span>
            <label className={styles.label}>{t("add_note_label", "أضف ملاحظة")}</label>
          </div>
          <InputGroup
            placeholder={t("add_note_placeholder", "اضف ملاحظتك هنا")}
            name="note"
            type="text"
            maxLength={300}
          />
        </div>
      </div>
    </div>
  );
};

export default StepFour;
