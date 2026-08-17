"use client";
import React from "react";
import styles from "./confirmationModal.module.css";
import Button from "../../../../../../ui/commen/button/Button";
import { useTranslation } from "react-i18next";

const ConfirmationModal = ({
  isOpen,
  onClose,
  onSkip,
  onSaveAndContinue,
  title,
  message,
  skipButtonText,
  saveButtonText,
}) => {
  const { t } = useTranslation("createEvent");

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            {title || t("unsaved_changes_title", "تحذير")}
          </h3>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>
        
        <div className={styles.content}>
          <p className={styles.message}>
            {message || t("unsaved_changes_message", "لديك بيانات غير محفوظة. هل تريد المتابعة دون حفظ؟")}
          </p>
        </div>
        
        <div className={styles.actions}>
          <Button
            variant="secondary"
            title={skipButtonText || t("skip_without_saving", "تخطي دون حفظ")}
            onClick={onSkip}
            className={styles.skipButton}
          />
          <Button
            variant="primary"
            title={saveButtonText || t("save_and_continue", "حفظ والمتابعة")}
            onClick={onSaveAndContinue}
            className={styles.saveButton}
          />
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
