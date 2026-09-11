"use client";
import Button from "@/ui/commen/button/Button";
import PopupLayout from "@/ui/commen/popup/PopupLayout";


import { useTranslation } from "react-i18next";
import { useAdminPaymentLinkDetail, useRefreshPaymentLink } from "@/hooks/admin";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import MoneyAmount from "@/ui/commen/MoneyAmount/MoneyAmount";
import {
  formatDateTime as sharedFormatDateTime,
} from "@halaa/shared/utils/locale";
import styles from "./AdminPaymentsClient.module.css";
import usePaymentLinkDialog from "./usePaymentLinkDialog";
import { handleError } from "@/services/errorHandlingService";
import { useState } from "react";
import PaymentDetailModal from "./PaymentDetailModal";

const formatDateTime = (dateStr, isArabic) => {
  if (!dateStr) return "—";
  return sharedFormatDateTime(dateStr, isArabic ? "ar" : "en") || "—";
};

export default function PaymentLinkDetailModal({ linkId, onClose }) {
  const { t, i18n } = useTranslation("adminPayments");
  const isArabic = i18n.language === "ar";
  const { data, isLoading, error } = useAdminPaymentLinkDetail(linkId);
  const refreshMutation = useRefreshPaymentLink();
  const [transactionId, setTransactionId] = useState(null);
  const dialogRef = usePaymentLinkDialog(!!linkId && !transactionId, onClose);
  if (!linkId) return null;
  const link = data?.data;

  const handleRefresh = async () => {
    try {
      await refreshMutation.mutateAsync(linkId);
    } catch (err) { handleError(err, t); }
  };

  return (
    <PopupLayout isOpen={!!linkId} onClose={onClose}>
      <div ref={dialogRef} tabIndex={-1} className={styles.dialogContent} role="dialog" aria-modal="true" aria-label={t("links.detail.title", "Payment link details")}>
        <h2 className={styles.modalTitle}>{t("links.detail.title", "Payment link details")}</h2>
        {error ? (
          <p role="alert">{t("errors.loadFailed", "Failed to load payments")}</p>
        ) : isLoading || !link ? (
          <SimpleLoading />
        ) : (
          <>
            {link.syncPending && <p role="status">{t("links.detail.syncPending", "Could not confirm the latest state. Another check is scheduled.")}</p>}
            {link.syncStale && <p role="status">{t("links.detail.syncStale")}</p>}
            {link.cancelPending && <p role="status">{t("links.detail.cancelPending", "Cancellation is awaiting provider confirmation.")}</p>}
            <div className={styles.detailGrid}>
              <span className={styles.detailLabel}>{t("links.detail.refunded", "Refunded (SAR)")}</span>
              <span className={styles.detailValue}>{link.refundedSar || "0.00"}</span>
              <span className={styles.detailLabel}>{t("links.columns.reference", "Reference")}</span>
              <span className={styles.detailMono} dir="ltr">{link.reference}</span>

              <span className={styles.detailLabel}>{t("links.columns.status", "Status")}</span>
              <span className={styles.detailValue}>{t(`links.status.${link.status}`, link.status)}</span>

              <span className={styles.detailLabel}>{t("links.columns.amount", "Amount")}</span>
              <span className={styles.detailValue}>
                <MoneyAmount amount={Number(link.amountSar || 0)} currency="SAR" locale={isArabic ? "ar" : "en"} />
              </span>

              <span className={styles.detailLabel}>{t("links.detail.description", "Description")}</span>
              <span className={styles.detailValue}>{link.description || "—"}</span>

              <span className={styles.detailLabel}>{t("links.detail.clientLabel", "Client label")}</span>
              <span className={styles.detailValue}>{link.clientLabel || "—"}</span>

              <span className={styles.detailLabel}>{t("links.detail.creator", "Creator")}</span>
              <span className={styles.detailValue}>
                {link.creator?.name || link.creator?.email || "—"}
              </span>

              <span className={styles.detailLabel}>{t("links.detail.expiry", "Expiry")}</span>
              <span className={styles.detailValue}>{formatDateTime(link.expiresAt, isArabic)}</span>

              <span className={styles.detailLabel}>{t("links.detail.createdAt", "Created at")}</span>
              <span className={styles.detailValue}>{formatDateTime(link.createdAt, isArabic)}</span>

              <span className={styles.detailLabel}>{t("links.detail.lastSync", "Last provider check")}</span>
              <span className={styles.detailValue}>{formatDateTime(link.lastSyncedAt, isArabic)}</span>

              {link.paidAt && (
                <>
                  <span className={styles.detailLabel}>{t("links.detail.paidAt", "Paid at")}</span>
                  <span className={styles.detailValue}>{formatDateTime(link.paidAt, isArabic)}</span>
                </>
              )}

              <span className={styles.detailLabel}>{t("links.detail.url", "Payment URL")}</span>
              <span className={styles.detailMono} dir="ltr" style={{ unicodeBidi: "plaintext" }}>
                {link.url || link.hostedUrl || "—"}
              </span>

              {link.lastFailureSummary && (
                <>
                  <span className={styles.detailLabel}>{t("links.detail.lastFailure", "Last attempt")}</span>
                  <span className={styles.detailValue}>{link.lastFailureSummary}</span>
                </>
              )}
            </div>

            {Array.isArray(link.transactions) && link.transactions.length > 0 && (
              <div className={styles.detailSection}>
                <div className={styles.detailSectionTitle}>
                  {t("links.detail.transactions", "Linked transactions")}
                </div>
                {link.transactions.map((tx) => (
                  <div key={tx.id} className={styles.refundRow}>
                    <span>
                      <MoneyAmount amount={tx.amount} currency={tx.currency || "SAR"} locale={isArabic ? "ar" : "en"} />
                      {` — ${t(`table.status.${tx.status}`, tx.status)}`}
                    </span>
                    <Button variant="secondary" onClick={() => setTransactionId(tx.id)} title={t("actions.viewDetails", "View details")} />
                  </div>
                ))}
              </div>
            )}

            <div className={styles.modalActions}>
              <Button
                type="button"
                onClick={handleRefresh}
                disabled={refreshMutation.isPending}
               variant="secondary" title={refreshMutation.isPending
                  ? t("links.actions.refreshing", "Checking…")
                  : t("links.actions.refresh", "Refresh status")} />
              <Button type="button" onClick={onClose} variant="secondary" title={t("actions.close", "Close")} />
            </div>
          </>
        )}
        {(error || !link) && <Button type="button" onClick={onClose} variant="secondary" title={t("actions.close", "Close")} />}
      </div>
      {transactionId && <PaymentDetailModal paymentId={transactionId} onClose={() => setTransactionId(null)} />}
    </PopupLayout>
  );
}
