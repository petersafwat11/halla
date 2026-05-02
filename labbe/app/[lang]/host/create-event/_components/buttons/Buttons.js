"use client";
import React from "react";
import styles from "./buttons.module.css";
import { useTranslation } from "react-i18next";

const Buttons = ({
  onNext,
  onPrevious,
  isNextDisabled = false,
  showPrevious = true,
  isLoading = false,
  currentStep = 1,
  totalSteps = 5,
}) => {
  const { t } = useTranslation("createEvent");

  const getNextButtonText = () => {
    if (isLoading) return t("saving");
    if (currentStep === totalSteps) return t("save");
    return t("next");
  };

  return (
    <div className={styles.buttons_container}>
      <button
        type="button"
        className={`${styles.button} ${styles.button_secondary}`}
        onClick={onPrevious}
        disabled={!showPrevious}
      >
        {t("previous")}
      </button>

      <button
        type="button"
        className={`${styles.button} ${styles.button_primary} ${isNextDisabled ? styles.button_disabled : ""
          }`}
        onClick={onNext}
        disabled={isNextDisabled || isLoading}
      >
        {getNextButtonText()}
      </button>
    </div>
  );
};

export default Buttons;
