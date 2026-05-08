"use client";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useAdminPaymentRefund,
  useAdminPaymentCapture,
  useAdminPaymentVoid,
} from "@/hooks/reactQueryHooks/useAdmin";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";

const newUuid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Encapsulates refund/capture/void state + Idempotency-Key minting
 * for the admin payments action modal.
 */
export default function usePaymentActions() {
  const { t } = useTranslation("adminPayments");
  const [actionPayment, setActionPayment] = useState(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  // Stable per-modal idempotency key. Re-mounting the modal mints a new
  // UUID; submitting twice from the same modal (double-click) reuses it.
  const idempotencyKey = useMemo(
    () => (actionPayment ? newUuid() : null),
    [actionPayment?.payment?._id, actionPayment?.type]
  );

  const refundMutation = useAdminPaymentRefund();
  const captureMutation = useAdminPaymentCapture();
  const voidMutation = useAdminPaymentVoid();

  const close = () => {
    setActionPayment(null);
    setAmount("");
    setReason("");
  };

  const submit = async () => {
    if (!actionPayment) return;
    const { payment, type } = actionPayment;
    try {
      if (type === "refund") {
        const amt = amount ? Number(amount) : undefined;
        await refundMutation.mutateAsync({
          id: payment._id,
          amount:
            typeof amt === "number" && !Number.isNaN(amt) ? amt : undefined,
          reason: reason || undefined,
          idempotencyKey,
        });
        toastUtils.success(t("refund.success", "Refund issued"));
      } else if (type === "capture") {
        const amt = amount ? Number(amount) : undefined;
        await captureMutation.mutateAsync({
          id: payment._id,
          amount:
            typeof amt === "number" && !Number.isNaN(amt) ? amt : undefined,
          idempotencyKey,
        });
        toastUtils.success(t("capture.success", "Payment captured"));
      } else if (type === "void") {
        await voidMutation.mutateAsync({ id: payment._id, idempotencyKey });
        toastUtils.success(t("void.success", "Payment voided"));
      }
      close();
    } catch (err) {
      handleError(err, t);
    }
  };

  return {
    actionPayment,
    setActionPayment,
    amount,
    setAmount,
    reason,
    setReason,
    submit,
    close,
    busy:
      refundMutation.isLoading ||
      captureMutation.isLoading ||
      voidMutation.isLoading,
  };
}
