"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import styles from "../../create-event/_components/buttons/buttons.module.css";

const UpdateButtons = ({
  onSave,
  onCancel,
  onNext,
  onPrevious,
  isSaveDisabled = false,
  showPrevious = false,
  showNext = false,
  isSaving = false,
  currentStep,
  totalSteps = 4,
}) => {
  const { t } = useTranslation("createEvent");
  return (
    <div className={styles.buttons_wrapper}>
      {/* Navigation Buttons (Previous/Next) */}
      <div className={styles.buttons_container}>
        {showPrevious && currentStep > 1 && (
          <button
            type="button"
            className={`${styles.button} ${styles.button_secondary}`}
            onClick={onPrevious}
            disabled={isSaving}
          >
            {t("previous")}
          </button>
        )}

        {showNext && currentStep < totalSteps && (
          <button
            type="button"
            className={`${styles.button} ${styles.button_primary}`}
            onClick={onNext}
            disabled={isSaving}
          >
            {t("next")}
          </button>
        )}
      </div>

      {/* Action Buttons (Save/Cancel) */}
      <div className={styles.buttons_container}>
        <button
          type="button"
          className={`${styles.button} ${styles.button_secondary}`}
          onClick={onCancel}
          disabled={isSaving}
        >
          {t("cancel")}
        </button>

        <button
          type="button"
          className={`${styles.button} ${styles.button_primary} ${isSaveDisabled ? styles.button_disabled : ""
            }`}
          onClick={onSave}
          disabled={isSaveDisabled || isSaving}
        >
          {isSaving ? t("loading.saving") : t("save_changes")}
        </button>
      </div>
    </div>
  );
};

export default UpdateButtons;
