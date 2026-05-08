"use client";
import { useTranslation } from "react-i18next";
import styles from "./AdminPaymentsClient.module.css";

export default function PaymentActionModal({
  actionPayment,
  amount,
  reason,
  onAmountChange,
  onReasonChange,
  onClose,
  onConfirm,
  busy,
}) {
  const { t } = useTranslation("adminPayments");
  if (!actionPayment) return null;
  const { payment, type } = actionPayment;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBody} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>
          {type === "refund" &&
            t("actions.confirmRefund", "Refund {{amount}} {{currency}}?", {
              amount: amount || payment.amount,
              currency: payment.currency || "SAR",
            })}
          {type === "capture" &&
            t("actions.confirmCapture", "Capture this authorized payment?")}
          {type === "void" &&
            t("actions.confirmVoid", "Void this authorized payment?")}
        </h2>
        {type === "refund" && (
          <>
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder={t(
                "actions.refundAmountPlaceholder",
                "Amount (blank = full)"
              )}
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              className={styles.modalInput}
            />
            <input
              type="text"
              placeholder={t("actions.reasonPlaceholder", "Reason")}
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              className={`${styles.modalInput} ${styles.modalInputLast}`}
            />
          </>
        )}
        {type === "capture" && (
          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder={t(
              "actions.captureAmountPlaceholder",
              "Amount (blank = full)"
            )}
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            className={`${styles.modalInput} ${styles.modalInputLast}`}
          />
        )}
        <div className={styles.modalActions}>
          <button type="button" onClick={onClose} className={styles.pageBtn}>
            {t("actions.cancel", "Cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={styles.modalConfirm}
          >
            {t("actions.confirm", "Confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
