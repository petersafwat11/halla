"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import MoneyAmount from "@/ui/commen/MoneyAmount/MoneyAmount";
import styles from "../summary.module.css";

const ProceedButton = ({ onClick, processing, finalTotal, t }) => {
  const { i18n } = useTranslation("plans");
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
            <MoneyAmount amount={finalTotal} locale={i18n?.language || "ar"} />
          </span>
        </>
      )}
    </button>
  );
};

export default ProceedButton;
