"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import { useAdminVendorMutation } from "@/hooks/admin";
import styles from "./VendorDetailsWrapper.module.css";

export default function VendorActionButtons({ vendor, currentStatus, updateStatus }) {
  const router = useRouter();
  const { t } = useTranslation("adminVendorDetails");

  const handleApprove = useCallback(async () => {
    try {
      await updateStatus.mutateAsync({
        vendorId: vendor.id || vendor._id,
        status: "approved",
      });
      toastUtils.success(t("messages.approveSuccess"));
      router.refresh();
    } catch (err) {
      handleError(err, t, { fallbackMessage: "messages.approveError" });
    }
  }, [updateStatus, vendor, t, router]);

  const handleSuspend = useCallback(async () => {
    const confirmed = window.confirm(t("actions.confirmSuspend"));
    if (!confirmed) return;
    try {
      await updateStatus.mutateAsync({
        vendorId: vendor.id || vendor._id,
        status: "suspended",
      });
      toastUtils.success(t("messages.suspendSuccess"));
      router.refresh();
    } catch (err) {
      handleError(err, t, { fallbackMessage: "messages.suspendError" });
    }
  }, [updateStatus, vendor, t, router]);

  const handleActivate = useCallback(async () => {
    try {
      await updateStatus.mutateAsync({
        vendorId: vendor.id || vendor._id,
        status: "approved",
      });
      toastUtils.success(t("messages.activateSuccess"));
      router.refresh();
    } catch (err) {
      handleError(err, t, { fallbackMessage: "messages.activateError" });
    }
  }, [updateStatus, vendor, t, router]);

  const isPendingOrRejected = currentStatus === "pending" || currentStatus === "rejected";
  const isSuspended = currentStatus === "suspended";

  return (
    <div className={styles.actions}>
      {isPendingOrRejected && (
        <button
          onClick={handleApprove}
          className={`${styles.actionBtn} ${styles.approveBtn}`}
          title={t("actions.approve")}
          disabled={updateStatus.isPending}
        >
          {t("actions.approve")}
        </button>
      )}

      {isSuspended ? (
        <button
          onClick={handleActivate}
          className={`${styles.actionBtn} ${styles.activateBtn}`}
          title={t("actions.activate")}
          disabled={updateStatus.isPending}
        >
          {t("actions.activate")}
        </button>
      ) : (
        !isPendingOrRejected && (
          <button
            onClick={handleSuspend}
            className={`${styles.actionBtn} ${styles.suspendBtn}`}
            title={t("actions.suspend")}
            disabled={updateStatus.isPending}
          >
            {t("actions.suspend")}
          </button>
        )
      )}
    </div>
  );
}
