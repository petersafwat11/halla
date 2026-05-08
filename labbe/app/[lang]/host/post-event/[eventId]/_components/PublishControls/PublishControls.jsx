"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  usePublishPostEventContent,
  useUnpublishPostEventContent,
} from "@/hooks/reactQueryHooks/post-event/useHostPostEvent";
import { handleError } from "@/services/errorHandlingService";
import styles from "./publishControls.module.css";

const ConfirmDialog = ({ open, title, message, onConfirm, onCancel, t }) => {
  if (!open) return null;
  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <h3 className={styles.modalTitle}>{title}</h3>
        <p className={styles.modalMessage}>{message}</p>
        <div className={styles.modalActions}>
          <button className={styles.cancelButton} onClick={onCancel}>
            {t("host.cancel")}
          </button>
          <button className={styles.confirmButton} onClick={onConfirm}>
            {t("host.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
};

const PublishControls = ({
  eventId,
  isPublished,
  hasMedia,
  hasTemplate,
  onSendAccessLinks,
}) => {
  const { t } = useTranslation("postEvent");
  const publish = usePublishPostEventContent();
  const unpublish = useUnpublishPostEventContent();
  const [confirm, setConfirm] = useState(null); // 'publish' | 'unpublish' | null

  const publishDisabled = !hasMedia || !hasTemplate || publish.isPending;
  const publishTooltip = !hasTemplate
    ? t("host.accessLinks.noTemplateConfigured")
    : !hasMedia
      ? t("host.media.empty")
      : "";

  const onPublish = () => {
    publish.mutate(
      { eventId },
      {
        onSuccess: () => {
          toast.success(t("host.publishSuccess"));
          setConfirm(null);
        },
        onError: (error) => {
          handleError(error, t);
          toast.error(t("host.errors.publishFailed"));
          setConfirm(null);
        },
      }
    );
  };

  const onUnpublish = () => {
    unpublish.mutate(
      { eventId },
      {
        onSuccess: () => {
          toast.success(t("host.unpublishSuccess"));
          setConfirm(null);
        },
        onError: (error) => {
          handleError(error, t);
          toast.error(t("host.errors.publishFailed"));
          setConfirm(null);
        },
      }
    );
  };

  return (
    <div className={styles.controls}>
      <div className={styles.statusBlock}>
        <span
          className={`${styles.dot} ${isPublished ? styles.dotPublished : styles.dotDraft}`}
        />
        <span className={styles.statusText}>
          {isPublished ? t("host.statusPublished") : t("host.statusDraft")}
        </span>
      </div>

      <div className={styles.buttons}>
        {!isPublished ? (
          <button
            className={styles.primaryButton}
            disabled={publishDisabled}
            title={publishTooltip}
            onClick={() => setConfirm("publish")}
          >
            {t("host.publish")}
          </button>
        ) : (
          <button
            className={styles.dangerButton}
            disabled={unpublish.isPending}
            onClick={() => setConfirm("unpublish")}
          >
            {t("host.unpublish")}
          </button>
        )}

        <button
          className={styles.secondaryButton}
          onClick={onSendAccessLinks}
        >
          {t("host.accessLinks.title")}
        </button>
      </div>

      <ConfirmDialog
        open={confirm === "publish"}
        title={t("host.publishConfirmTitle")}
        message={t("host.publishConfirmMessage")}
        onConfirm={onPublish}
        onCancel={() => setConfirm(null)}
        t={t}
      />
      <ConfirmDialog
        open={confirm === "unpublish"}
        title={t("host.unpublishConfirmTitle")}
        message={t("host.unpublishConfirmMessage")}
        onConfirm={onUnpublish}
        onCancel={() => setConfirm(null)}
        t={t}
      />
    </div>
  );
};

export default PublishControls;
