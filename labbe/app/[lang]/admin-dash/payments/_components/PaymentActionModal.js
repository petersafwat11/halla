"use client";

import { useEffect, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import TextArea from "@/ui/commen/inputs/inputGroup/TextArea";
import Button from "@/ui/commen/button/Button";
import styles from "./PaymentActionModal.module.css";

const buildSchema = (type, remainingAmount) => {
  const base = z.object({
    amount: z.preprocess(
      (val) =>
        val === "" || val === undefined || val === null ? undefined : Number(val),
      z.number().positive().optional()
    ),
    reason: z.string().trim().max(500).optional(),
  });

  if (type === "refund") {
    return base.refine(
      (data) => {
        if (data.amount == null) return true;
        return data.amount <= remainingAmount;
      },
      {
        message: `Amount must not exceed remaining ${remainingAmount}`,
        path: ["amount"],
      }
    );
  }

  return base;
};

const formatCurrency = (amount, currency = "SAR", isArabic) =>
  new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount || 0);

export default function PaymentActionModal({
  actionPayment,
  onClose,
  onConfirm,
  busy,
}) {
  const { t, i18n } = useTranslation("adminPayments");
  const isArabic = i18n.language === "ar";

  const { payment, type } = actionPayment || {};

  const remainingAmount = useMemo(() => {
    if (!payment) return 0;
    return payment.amount - (payment.refundedAmount || 0);
  }, [payment]);

  const schema = useMemo(
    () => buildSchema(type, remainingAmount),
    [type, remainingAmount]
  );

  const methods = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: "",
      reason: "",
    },
  });

  const { reset, handleSubmit, formState } = methods;

  // Reset form whenever the modal opens with a new payment/type
  useEffect(() => {
    if (actionPayment) {
      reset({ amount: "", reason: "" });
    }
  }, [actionPayment, reset]);

  if (!actionPayment) return null;

  const onSubmit = (data) => {
    const payload = {
      amount: data.amount,
      reason: data.reason,
    };
    onConfirm(payload);
  };

  const confirmTitle =
    type === "refund"
      ? busy
        ? t("actions.refunding", "Refunding...")
        : t("actions.confirmRefund", "Confirm Refund")
      : type === "capture"
      ? busy
        ? t("actions.capturing", "Capturing...")
        : t("actions.confirmCapture", "Confirm Capture")
      : busy
      ? t("actions.voiding", "Voiding...")
      : t("actions.confirmVoid", "Confirm Void");

  return (
    <PopupLayout isOpen={true} onClose={onClose} size="auto">
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {type === "refund" &&
              t("actions.refundTitle", "Refund Payment")}
            {type === "capture" &&
              t("actions.captureTitle", "Capture Payment")}
            {type === "void" && t("actions.voidTitle", "Void Payment")}
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label={t("actions.close", "Close")}
          >
            ×
          </button>
        </div>

        <div className={styles.infoBox}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>
              {t("detail.amount", "Amount")}
            </span>
            <span className={styles.infoValue}>
              {formatCurrency(payment.amount, payment.currency, isArabic)}
            </span>
          </div>
          {type === "refund" && payment.refundedAmount > 0 && (
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>
                {t("detail.alreadyRefunded", "Already refunded")}
              </span>
              <span className={styles.infoValue}>
                {formatCurrency(
                  payment.refundedAmount,
                  payment.currency,
                  isArabic
                )}
              </span>
            </div>
          )}
          {type === "refund" && (
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>
                {t("detail.remaining", "Remaining")}
              </span>
              <span className={styles.infoValue}>
                {formatCurrency(remainingAmount, payment.currency, isArabic)}
              </span>
            </div>
          )}
        </div>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            {(type === "refund" || type === "capture") && (
              <InputGroup
                label={
                  type === "refund"
                    ? t("actions.refundAmount", "Refund amount")
                    : t("actions.captureAmount", "Capture amount")
                }
                placeholder={t(
                  "actions.amountPlaceholder",
                  "Leave blank for full amount"
                )}
                type="number"
                name="amount"
                hintMessage={
                  type === "refund"
                    ? t(
                        "actions.refundAmountHint",
                        "Leave empty to refund the full remaining amount"
                      )
                    : t(
                        "actions.captureAmountHint",
                        "Leave empty to capture the full authorized amount"
                      )
                }
              />
            )}

            {type === "refund" && (
              <TextArea
                label={t("actions.reason", "Reason (optional)")}
                placeholder={t(
                  "actions.reasonPlaceholder",
                  "Enter a reason for the refund..."
                )}
                name="reason"
                maxLength={500}
                rows={3}
              />
            )}

            <div className={styles.actions}>
              <Button
                variant="secondary"
                title={t("actions.cancel", "Cancel")}
                onClick={onClose}
                disabled={busy}
                type="button"
              />
              <Button
                variant="primary"
                title={confirmTitle}
                type="submit"
                disabled={busy || formState.isSubmitting}
              />
            </div>
          </form>
        </FormProvider>
      </div>
    </PopupLayout>
  );
}
