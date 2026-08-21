"use client";
import React from "react";
import { formatSar } from "@halaa/shared/utils";
import AddonsSummaryCard from "./AddonsSummaryCard";
import styles from "../summary.module.css";

const PaymentSummaryCard = ({
  planPrice,
  addonItems,
  discountAmount,
  finalTotal,
  t,
}) => {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>{t("summary.payment.title")}</h2>
      </div>
      <div className={styles.cardContent}>
        <div className={styles.summaryBreakdown}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>
              {t("summary.payment.planPrice")}
            </span>
            <span className={styles.summaryValue}>
              {formatSar(planPrice)} {t("common.currency.sar")}
            </span>
          </div>

          <AddonsSummaryCard addonItems={addonItems} t={t} />

          {discountAmount > 0 && (
            <div className={`${styles.summaryRow} ${styles.discountRow}`}>
              <span className={styles.summaryLabel}>
                {t("summary.payment.discount")}
              </span>
              <span className={styles.summaryValueDiscount}>
                -{formatSar(discountAmount)} {t("common.currency.sar")}
              </span>
            </div>
          )}

          <div className={styles.summaryDivider}></div>

          <div className={`${styles.summaryRow} ${styles.totalRow}`}>
            <span className={styles.totalLabel}>
              {t("summary.payment.total")}
            </span>
            <span className={styles.totalValue}>
              {formatSar(finalTotal)} {t("common.currency.sar")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSummaryCard;
