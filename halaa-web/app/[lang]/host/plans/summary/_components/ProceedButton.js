"use client";
import React from "react";
import { formatSar } from "@halaa/shared/utils";
import styles from "../summary.module.css";

const ProceedButton = ({ onClick, processing, finalTotal, t }) => {
  return (
    <button
      className={styles.proceedButton}
      onClick={onClick}
      disabled={processing}
      type="button"
    >
      {processing ? (
        <span className={styles.processingText}>
          {t("summary.proceed.processing")}
        </span>
      ) : (
        <>
          <span>{t("summary.proceed.cta")}</span>
          <span className={styles.totalBadge}>
            {formatSar(finalTotal)} {t("common.currency.sar")}
          </span>
        </>
      )}
    </button>
  );
};

export default ProceedButton;
