"use client";
import React from "react";
import { FaTag, FaTimes } from "react-icons/fa";
import styles from "../summary.module.css";

const DiscountCodeCard = ({
  discountCode,
  onCodeChange,
  onApply,
  onRemove,
  applied,
  loading,
  amount,
  appliedCode,
  errorMessage,
  t,
}) => {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>
          <FaTag className={styles.cardTitleIcon} />
          {t("summary.discount.title")}
        </h2>
      </div>
      <div className={styles.cardContent}>
        <div className={styles.discountInputWrapper}>
          <input
            type="text"
            placeholder={t("summary.discount.placeholder")}
            value={discountCode}
            onChange={(e) => onCodeChange(e.target.value)}
            className={`${styles.discountInput} ${
              applied ? styles.discountApplied : ""
            } ${errorMessage ? styles.discountError : ""}`}
            disabled={applied || loading}
          />
          {applied ? (
            <button
              className={`${styles.applyButton} ${styles.removeButton}`}
              onClick={onRemove}
              type="button"
            >
              <FaTimes /> {t("summary.discount.remove")}
            </button>
          ) : (
            <button
              className={styles.applyButton}
              onClick={onApply}
              disabled={!discountCode.trim() || loading}
              type="button"
            >
              {loading ? "..." : t("summary.discount.apply")}
            </button>
          )}
        </div>
        {applied && (
          <p className={styles.discountSuccess}>
            {t("summary.discount.success", {
              code: appliedCode,
              amount: typeof amount === "number" ? amount.toFixed(2).replace(/\.00$/, "") : amount,
            })}
          </p>
        )}
        {errorMessage && !applied && (
          <p className={styles.discountErrorMsg}>{errorMessage}</p>
        )}
      </div>
    </div>
  );
};

export default DiscountCodeCard;
