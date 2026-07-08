"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useHostTaqnyatTemplates } from "@/hooks/taqnyatTemplates";
import { useUpdatePostEventMessagingTemplate } from "@/hooks/postEvent";
import { handleError } from "@/services/errorHandlingService";
import styles from "./messagingTemplatePicker.module.css";

const SkeletonList = () => (
  <div className={styles.skeletonList}>
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className={styles.skeletonCard}
        style={{ animationDelay: `${i * 0.12}s` }}
      >
        <div className={styles.skeletonRow}>
          <div className={`${styles.skeletonPulse} ${styles.skeletonRadio}`} />
          <div className={`${styles.skeletonPulse} ${styles.skeletonTitle}`} />
        </div>
        <div className={`${styles.skeletonPulse} ${styles.skeletonBody}`} />
      </div>
    ))}
  </div>
);

const EmptyState = ({ t }) => (
  <div className={styles.emptyState}>
    <div className={styles.emptyIcon}>✉</div>
    <p className={styles.emptyTitle}>{t("host.messaging.empty")}</p>
    <p className={styles.emptyHint}>{t("host.messaging.emptyHint")}</p>
  </div>
);

const TemplateCard = ({ template, isSelected, onSelect, t }) => (
  <button
    type="button"
    className={`${styles.templateCard} ${isSelected ? styles.templateCardSelected : ""}`}
    onClick={() => onSelect(template)}
  >
    <div className={styles.cardTopRow}>
      <span className={styles.templateName}>{template.templateName}</span>
      <span
        className={`${styles.radioRing} ${isSelected ? styles.radioRingSelected : ""}`}
      >
        {isSelected && <span className={styles.radioDot} />}
      </span>
    </div>
    {template.bodyText && (
      <div className={styles.bubbleWrap}>
        <p className={styles.bubbleText}>{template.bodyText}</p>
      </div>
    )}
    {template.varMapping?.length > 0 && (
      <small className={styles.varCount}>
        {t("host.messaging.varCount", { count: template.varMapping.length })}
      </small>
    )}
  </button>
);

const MessagingTemplatePicker = ({ eventId, savedTemplateRef }) => {
  const { t } = useTranslation("postEvent");
  const { data, isLoading } = useHostTaqnyatTemplates({ type: "post_event" });
  const saveTemplate = useUpdatePostEventMessagingTemplate();

  const templates = data?.data?.templates || data?.templates || [];

  const handleSelect = (template) => {
    saveTemplate.mutate(
      { eventId, taqnyatTemplateRef: template._id },
      {
        onSuccess: () => toast.success(t("host.messaging.saveSuccess")),
        onError: (error) => {
          handleError(error, t);
          toast.error(t("host.messaging.saveFailed"));
        },
      }
    );
  };

  const savedId =
    typeof savedTemplateRef === "object" && savedTemplateRef
      ? savedTemplateRef._id
      : savedTemplateRef;

  return (
    <div className={styles.section}>
      <div className={styles.headerRow}>
        <h3 className={styles.title}>{t("host.messaging.title")}</h3>
        <p className={styles.subtitle}>{t("host.messaging.subtitle")}</p>
      </div>

      {isLoading ? (
        <SkeletonList />
      ) : templates.length === 0 ? (
        <EmptyState t={t} />
      ) : (
        <div className={styles.templateList}>
          {templates.map((template) => (
            <TemplateCard
              key={template._id}
              template={template}
              isSelected={String(savedId) === String(template._id)}
              onSelect={handleSelect}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MessagingTemplatePicker;
