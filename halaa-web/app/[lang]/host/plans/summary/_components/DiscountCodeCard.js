"use client";
import React from "react";
import { FaTag, FaTimes } from "react-icons/fa";
import styles from "../summary.module.css";
import { useTranslation } from "react-i18next";
import MoneyAmount from "@/ui/commen/MoneyAmount/MoneyAmount";

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
  const { i18n } = useTranslation("plans");
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
            {t("summary.discount.successBeforeAmount", {
              code: appliedCode,
              defaultValue: i18n.language === "ar" ? `✓ كود "${appliedCode}" — خصم` : `✓ Code "${appliedCode}" —`,
            })}
            {" "}<MoneyAmount amount={amount} locale={i18n.language} />{" "}
            {t("summary.discount.successAfterAmount", {
              defaultValue: i18n.language === "ar" ? "" : "off",
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
