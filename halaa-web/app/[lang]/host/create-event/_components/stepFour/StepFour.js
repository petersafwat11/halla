"use client";
/**
 * StepFour — Taqnyat picker + auto-replies (5-step wizard)
 *
 * Step 4 combines the Taqnyat-template picker (filtered by the event
 * category chosen in step 1) with the auto-replies editor below it.
 *
 * Saves the host's pick into:
 *   - selectedTemplate (legacy, for messaging.service compat)
 *   - taqnyatTemplate.templateRef (canonical)
 *
 * Auto-replies dual-write canonical guestReplies.* + legacy keys.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import styles from "./stepfour.module.css";
import { useHostTaqnyatTemplates } from "@/hooks/taqnyatTemplates";
import {
  resolveTaqnyatPlaceholders,
  buildTaqnyatPreviewContext,
} from "@halaa/shared/utils";
import { formatDate } from "@halaa/shared/utils/locale";
import useAuthStore from "@/stores/authStore";
import {
  INVITATION_TYPE_OPTIONS,
  DEFAULT_INVITATION_TYPE,
  invitationAllowsReply,
} from "@/utils/invitationTypes";

// Dedicated Hero Icons for the 3 invitation types
const QrPassHeroIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    <rect x="5.5" y="5.5" width="2" height="2" fill="currentColor" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    <rect x="16.5" y="5.5" width="2" height="2" fill="currentColor" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    <rect x="5.5" y="16.5" width="2" height="2" fill="currentColor" />
    <path d="M14 14H16V16H14V14Z" fill="currentColor" />
    <path d="M18 14H20V16H18V14Z" fill="currentColor" />
    <path d="M14 18H16V20H14V18Z" fill="currentColor" />
    <path d="M18 18H20V20H18V18Z" fill="currentColor" />
  </svg>
);

const ChatRsvpHeroIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M8 12H8.01M12 12H12.01M16 12H16.01M21 12C21 16.4183 16.9706 20 12 20C10.4578 20 9.00698 19.6534 7.74716 19.0435L3 20L4.36486 16.812C3.51139 15.4241 3 13.7844 3 12C3 7.58172 7.02944 4 12 4C16.9706 4 21 7.58172 21 12Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DirectMailHeroIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M3 7.5L10.7 12.6C11.5 13.1 12.5 13.1 13.3 12.6L21 7.5M5 19H19C20.1 19 21 18.1 21 17V7C21 5.9 20.1 5 19 5H5C3.9 5 3 5.9 3 7V17C3 18.1 3.9 19 5 19Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CheckIcon = () => (
  <svg width="11" height="9" viewBox="0 0 11 9" fill="none" aria-hidden="true">
    <path d="M1 4.5L3.8 7.5L10 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MiniCheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M2.5 6.2L4.8 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MiniCrossIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M3.5 3.5L8.5 8.5M8.5 3.5L3.5 8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const REPLY_TABS = [
  {
    key: "attending",
    labelKey: "auto_replies_tab_attending",
    fallback: "الحضور",
    canonical: "onAttend",
    defaultKey: "auto_replies_default_attending",
    defaultText: "شكرًا لتأكيد حضورك! يسعدنا أن تكون معنا في هذه المناسبة. 🎉",
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
  const { t, i18n } = useTranslation("createEvent");
  const [activeTab, setActiveTab] = useState("attending");
  const previousCategoryRef = useRef("");
  const previousInvitationTypeRef = useRef("");

  const selectedTemplate = watch("selectedTemplate");
  const guestReplies = watch("guestReplies") || {};
  const invitationType = watch("invitationType") || DEFAULT_INVITATION_TYPE;
  const replyAllowed = invitationAllowsReply(invitationType);
  const eventName = watch("eventName");
  const eventDate = watch("eventDate");
  const eventTime = watch("eventTime");
  const address = watch("address");
  const hostName = useAuthStore(
    (state) => state.user?.name || ""
  );

  // Build the preview context once per form change. The same context drives
  // placeholder substitution in the template-picker list AND the WhatsApp
  // preview pane, mirroring the backend resolver semantics so what the host
  // sees on screen matches what the guest receives.
  const previewContext = useMemo(() => {
    const locale = i18n?.language || "ar";
    const dateFormatted = eventDate ? formatDate(eventDate, locale) : "";
    return buildTaqnyatPreviewContext({
      guestName:
        i18n?.language === "en" ? "Dear Guest" : "ضيفنا الكريم",
      eventTitle: eventName,
      dateFormatted,
      eventTime,
      locationAddress: address?.address || "",
      hostName,
    });
  }, [eventName, eventDate, eventTime, address?.address, hostName, i18n?.language]);

  // Filter templates by the event category chosen in step 1 (eventType),
  // not the visual template picked in step 3.
  const category = watch("eventType") || "";

  const { data, isLoading, error } = useHostTaqnyatTemplates(
    {
      category: category || undefined,
      type: "invite",
      invitationMode: invitationType,
    },
    { enabled: Boolean(category) }
  );
  const templates = data?.data?.templates || [];

  useEffect(() => {
    const previousCategory = previousCategoryRef.current;
    if (previousCategory && category && previousCategory !== category) {
      setValue("selectedTemplate", null, { shouldDirty: true });
      setValue("taqnyatTemplate", { templateRef: null }, { shouldDirty: true });
    }
    previousCategoryRef.current = category;
  }, [category, setValue]);

  useEffect(() => {
    const previousMode = previousInvitationTypeRef.current;
    if (previousMode && previousMode !== invitationType) {
      setValue("selectedTemplate", null, { shouldDirty: true });
      setValue("taqnyatTemplate", { templateRef: null }, { shouldDirty: true });
    }
    previousInvitationTypeRef.current = invitationType;
  }, [invitationType, setValue]);

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
      // Keep the admin-curated placeholder mapping so the WhatsApp preview
      // resolves `{{N}}` slots exactly like the picker cards do.
      varMapping: template.varMapping,
      category: template.category || category,
      invitationMode: template.invitationMode || invitationType,
      buttons: template.buttons || [],
    };
    setValue("selectedTemplate", enriched, { shouldValidate: true });
    setValue("taqnyatTemplate", { templateRef: template._id }, { shouldValidate: false });
  };

  useEffect(() => {
    if (templates.length !== 1) return;
    const onlyTemplate = templates[0];
    const selectedId = selectedTemplate?._id || selectedTemplate?.id;
    if (
      selectedId === onlyTemplate._id ||
      selectedTemplate?.name === onlyTemplate.templateName
    ) return;
    handleTemplateSelect(onlyTemplate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates, selectedTemplate?._id, selectedTemplate?.id]);

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
        {/* ── Invitation type ──────────────────────────────────── */}
        <div className={styles.inviteTypeSection}>
          <div className={styles.repliesHeader}>
            <label className={styles.sectionLabel}>
              {t("invitation_type", "نوع الدعوة")}
            </label>
            <p className={styles.repliesHint}>
              {t(
                "invitation_type_hint",
                "حدّد الرسالة التي تصل بعد تأكيد الضيف، أو أرسل دعوة نصية فقط بدون أزرار."
              )}
            </p>
          </div>

          <div className={styles.inviteTypeGrid}>
            {INVITATION_TYPE_OPTIONS.map((opt) => {
              const isSelected = invitationType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.inviteTypeCard} ${isSelected ? styles.inviteTypeCardSelected : ""}`}
                  onClick={() =>
                    setValue("invitationType", opt.value, { shouldDirty: true })
                  }
                  aria-pressed={isSelected}
                >
                  <div className={styles.cardHeader}>
                    <div className={styles.iconBox}>
                      {opt.value === "reply_and_qr" && <QrPassHeroIcon />}
                      {opt.value === "reply_only" && <ChatRsvpHeroIcon />}
                      {opt.value === "none" && <DirectMailHeroIcon />}
                    </div>
                    <div className={styles.cardHeaderMeta}>
                      <span className={styles.inviteTypeNum}>{opt.id}</span>
                      {opt.badgeKey && (
                        <span className={styles.featureBadge}>
                          {t(opt.badgeKey, "شامل رمز الدخول")}
                        </span>
                      )}
                    </div>
                    <span
                      className={`${styles.radioIndicator} ${isSelected ? styles.radioIndicatorActive : ""}`}
                    >
                      {isSelected && <CheckIcon />}
                    </span>
                  </div>

                  <div className={styles.cardContent}>
                    <p className={styles.inviteTypeTitle}>{t(opt.labelKey)}</p>
                    <p className={styles.inviteTypeDesc}>{t(opt.descKey)}</p>
                  </div>

                  {opt.features && opt.features.length > 0 && (
                    <div className={styles.featureChipsList}>
                      {opt.features.map((feat) => (
                        <span
                          key={feat.key}
                          className={`${styles.featureChip} ${
                            feat.included
                              ? styles.featureChipIncluded
                              : styles.featureChipExcluded
                          }`}
                        >
                          {feat.included ? <MiniCheckIcon /> : <MiniCrossIcon />}
                          {t(feat.labelKey, feat.fallback)}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

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
                      {template.bodyText && (
                        <div className={styles.bubbleWrap}>
                          <p className={styles.bubbleText}>
                            {resolveTaqnyatPlaceholders(
                              template.bodyText,
                              template.varMapping,
                              previewContext
                            )}
                          </p>
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
        {/* Plain invitations do not send auto-replies. */}
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

          {replyAllowed ? (
            <>
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
                dir={i18n?.language === "ar" ? "rtl" : "ltr"}
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  fontFamily: "inherit",
                  fontSize: 14,
                  direction: i18n?.language === "ar" ? "rtl" : "ltr",
                  textAlign: i18n?.language === "ar" ? "right" : "left",
                }}
              />
            </>
          ) : (
            <div className={styles.repliesDisabledNote}>
              {t(
                "auto_replies_disabled_note",
                "لا تحتوي هذه الدعوة على إمكانية الرد، لذلك لن تُرسل ردود تلقائية."
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StepFour;
