"use client";
import React from "react";
import styles from "./BulkActionConfirmModal.module.css";

/**
 * Confirmation modal for the pool-charged guest-table bulk actions (resend
 * invitation / extra reminder). Shows the cost summary —
 * "Will send to N · costs N invites · M remaining" — and disables the confirm
 * button when the selection exceeds the host's remaining invites (`null`
 * remaining = truly unlimited, never blocked).
 */
export default function BulkActionConfirmModal({
  isOpen,
  type,
  count,
  invitesRemaining,
  isLoading = false,
  onConfirm,
  onClose,
  t,
}) {
  if (!isOpen) return null;

  const isUnlimited = invitesRemaining == null;
  const overQuota = !isUnlimited && count > invitesRemaining;
  const remainingDisplay = isUnlimited
    ? t("remainingInvites.unlimited", "Unlimited")
    : invitesRemaining;

  const title =
    type === "resend"
      ? t("singleEvent.bulkActions.resendTitle", "Resend invitation")
      : t("singleEvent.bulkActions.extraReminderTitle", "Extra reminder");

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>{title}</h3>

        <p className={styles.summary}>
          {t("singleEvent.bulkActions.costSummary", {
            defaultValue:
              "Will send to {{count}} · costs {{count}} invites · {{remaining}} remaining",
            count,
            remaining: remainingDisplay,
          })}
        </p>

        {overQuota && (
          <p className={styles.warning}>
            {t(
              "singleEvent.bulkActions.insufficientInvites",
              "Not enough invites — buy more in Plans."
            )}
          </p>
        )}

        <div className={styles.actions}>
          <button
            className={styles.cancelButton}
            onClick={onClose}
            disabled={isLoading}
            type="button"
          >
            {t("common.cancel", "Cancel")}
          </button>
          <button
            className={styles.confirmButton}
            onClick={onConfirm}
            disabled={isLoading || overQuota}
            type="button"
          >
            {isLoading
              ? t("common.sending", "Sending...")
              : t("common.send", "Send")}
          </button>
        </div>
      </div>
    </div>
  );
}
