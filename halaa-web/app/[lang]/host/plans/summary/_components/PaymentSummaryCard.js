"use client";
import React from "react";
import { formatSar, formatDate, formatTime } from "@halaa/shared/utils";
import AddonsSummaryCard from "./AddonsSummaryCard";
import styles from "../summary.module.css";

const PaymentSummaryCard = ({
  planPrice,
  addonItems = [],
  discountAmount = 0,
  finalTotal,
  currency = "SAR",
  quoteExpiresAt = null,
  isExpired = false,
  isLoading = false,
  onRefreshQuote,
  t,
}) => {
  const currencyLabel = currency === "SAR" ? t("common.currency.sar") : currency;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>{t("summary.payment.title")}</h2>
        {isLoading && (
          <span className={styles.loadingTag}>
            {t("common.loading", "Loading...")}
          </span>
        )}
      </div>
      <div className={styles.cardContent}>
        <div className={styles.summaryBreakdown}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>
              {t("summary.payment.planPrice")}
            </span>
            <span className={styles.summaryValue}>
              {planPrice != null ? `${formatSar(planPrice)} ${currencyLabel}` : "—"}
            </span>
          </div>

          <AddonsSummaryCard addonItems={addonItems} currency={currency} t={t} />

          {discountAmount > 0 && (
            <div className={`${styles.summaryRow} ${styles.discountRow}`}>
              <span className={styles.summaryLabel}>
                {t("summary.payment.discount")}
              </span>
              <span className={styles.summaryValueDiscount}>
                -{formatSar(discountAmount)} {currencyLabel}
              </span>
            </div>
          )}

          <div className={styles.summaryDivider}></div>

          <div className={`${styles.summaryRow} ${styles.totalRow}`}>
            <span className={styles.totalLabel}>
              {t("summary.payment.total")}
            </span>
            <span className={styles.totalValue}>
              {finalTotal != null ? `${formatSar(finalTotal)} ${currencyLabel}` : "—"}
            </span>
          </div>

          {/* Expiry metadata & refresh button (PR5 / F-07) */}
          {quoteExpiresAt && (
            <div className={`${styles.expiryBox} ${isExpired ? styles.expiryBoxExpired : ""}`}>
              <span className={styles.expiryText}>
                {isExpired
                  ? t("summary.quote.expiredNotice", "Quote has expired.")
                  : t("summary.quote.validUntil", "Quote valid until:") + " " + formatTime(quoteExpiresAt)}
              </span>
              {isExpired && onRefreshQuote && (
                <button
                  type="button"
                  className={styles.refreshQuoteBtn}
                  onClick={onRefreshQuote}
                >
                  {t("summary.quote.refreshCta", "Refresh Quote")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentSummaryCard;
