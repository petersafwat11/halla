"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import styles from "./serviceDetailsSection.module.css";

const EditFormHeader = ({ onClose }) => {
  const { t } = useTranslation("vendorSettings");

  return (
    <div className={styles.editFormHeader}>
      <button onClick={onClose} className={styles.editFormCloseButton} type="button">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M2 22L22 2" stroke="#292D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M22 22L2 2" stroke="#292D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <h2 className={styles.editFormTitle}>{t("serviceDetails.title")}</h2>
    </div>
  );
};

export default EditFormHeader;
