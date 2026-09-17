"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAdminPaymentLinkDetail, useRefreshPaymentLink } from "@/hooks/admin";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import StatusBadge from "@/components/shared/StatusBadge";
import MoneyAmount from "@/ui/commen/MoneyAmount/MoneyAmount";
import { formatDateTime as sharedFormatDateTime } from "@halaa/shared/utils/locale";
import { handleError } from "@/services/errorHandlingService";
import CopyableValue from "./CopyableValue";
import PaymentDetailModal from "./PaymentDetailModal";
import usePaymentLinkDialog from "./usePaymentLinkDialog";
import styles from "./PaymentDetailPopup.module.css";

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
  const locale = isArabic ? "ar" : "en";

  const handleRefresh = async () => {
    try {
      await refreshMutation.mutateAsync(linkId);
    } catch (err) {
      handleError(err, t);
    }
  };

  const requestRows = link
    ? [
        [t("links.detail.description", "Description"), link.description || "—"],
        [t("links.detail.clientLabel", "Client label"), link.clientLabel || "—"],
        [
          t("links.detail.creator", "Creator"),
          link.creator?.name || link.creator?.email || "—",
        ],
        [t("links.detail.createdAt", "Created at"), formatDateTime(link.createdAt, isArabic)],
      ]
    : [];

  return (
    <>
      <PopupLayout isOpen={!!linkId} onClose={onClose} size="auto">
        <div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={t("links.detail.title", "Payment link details")}
          className={styles.popupWide}
        >
          <div className={styles.header}>
            <div className={styles.headerMain}>
              <h2 className={styles.title}>
                {t("links.detail.title", "Payment link details")}
              </h2>
              {link && (
                <div className={styles.kicker}>
                  <StatusBadge
                    status={link.status}
                    domain="payment"
                    text={t(`links.status.${link.status}`, link.status)}
                  />
                  <span className={styles.reference} dir="ltr">
                    {link.reference}
                  </span>
                </div>
              )}
            </div>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label={t("actions.close", "Close")}
            >
              ×
            </button>
          </div>

          {error ? (
            <p className={styles.noticeError} role="alert">
              {t("errors.loadFailed", "Failed to load payments")}
            </p>
          ) : isLoading || !link ? (
            <div className={styles.state}>
              <SimpleLoading />
            </div>
          ) : (
            <>
              {(link.syncPending || link.syncStale || link.cancelPending) && (
                <div className={styles.notices}>
                  {link.syncPending && (
                    <p className={styles.notice} role="status">
                      {t(
                        "links.detail.syncPending",
                        "Could not confirm the latest state. Another check is scheduled."
                      )}
                    </p>
                  )}
                  {link.syncStale && (
                    <p className={styles.notice} role="status">
                      {t("links.detail.syncStale")}
                    </p>
                  )}
                  {link.cancelPending && (
                    <p className={styles.notice} role="status">
                      {t(
                        "links.detail.cancelPending",
                        "Cancellation is awaiting provider confirmation."
                      )}
                    </p>
                  )}
                </div>
              )}

              <div className={styles.summaryGrid}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>
                    {t("links.columns.amount", "Amount")}
                  </span>
                  <span className={styles.summaryValue}>
                    <MoneyAmount amount={Number(link.amountSar || 0)} currency="SAR" locale={locale} />
                  </span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>
                    {t("links.detail.collected", "Collected")}
                  </span>
                  <span className={styles.summaryValue}>
                    <MoneyAmount
                      amount={Number(link.collectedSar || 0)}
                      currency="SAR"
                      locale={locale}
                    />
                  </span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>
                    {t("links.detail.refunded", "Refunded")}
                  </span>
                  <span className={styles.summaryValue}>
                    <MoneyAmount
                      amount={Number(link.refundedSar || 0)}
                      currency="SAR"
                      locale={locale}
                    />
                  </span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>
                    {t("links.detail.expiry", "Expiry")}
                  </span>
                  <span className={styles.summaryValue}>
                    {formatDateTime(link.expiresAt, isArabic)}
                  </span>
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  {t("links.detail.sections.request", "Request")}
                </h3>
                <div className={styles.rows}>
                  {requestRows.map(([label, value]) => (
                    <div className={styles.row} key={label}>
                      <span className={styles.rowLabel}>{label}</span>
                      <span className={styles.rowValue}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  {t("links.detail.sections.provider", "Provider state")}
                </h3>
                <div className={styles.rows}>
                  <div className={styles.row}>
                    <span className={styles.rowLabel}>
                      {t("links.detail.invoiceStatus", "Invoice status")}
                    </span>
                    <span className={styles.rowValue}>
                      {link.invoiceStatus
                        ? t(`links.invoiceStatus.${link.invoiceStatus}`, link.invoiceStatus)
                        : "—"}
                    </span>
                  </div>
                  <div className={styles.row}>
                    <span className={styles.rowLabel}>
                      {t("links.detail.lastSync", "Last provider check")}
                    </span>
                    <span className={styles.rowValue}>
                      {formatDateTime(link.lastSyncedAt, isArabic)}
                    </span>
                  </div>
                  {link.paidAt && (
                    <div className={styles.row}>
                      <span className={styles.rowLabel}>
                        {t("links.detail.paidAt", "Paid at")}
                      </span>
                      <span className={styles.rowValue}>
                        {formatDateTime(link.paidAt, isArabic)}
                      </span>
                    </div>
                  )}
                  {link.lastFailureSummary && (
                    <div className={styles.row}>
                      <span className={styles.rowLabel}>
                        {t("links.detail.lastFailure", "Last attempt")}
                      </span>
                      <span className={styles.rowValue}>{link.lastFailureSummary}</span>
                    </div>
                  )}
                  <div className={styles.row}>
                    <span className={styles.rowLabel}>{t("links.detail.url", "Payment URL")}</span>
                    <CopyableValue value={link.url || link.hostedUrl} />
                  </div>
                </div>
              </div>

              {Array.isArray(link.transactions) && link.transactions.length > 0 && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    {t("links.detail.transactions", "Linked transactions")}
                  </h3>
                  <div className={styles.rows}>
                    {link.transactions.map((tx) => (
                      <div className={styles.txRow} key={tx.id}>
                        <span className={styles.txMain}>
                          <MoneyAmount
                            amount={tx.amount}
                            currency={tx.currency || "SAR"}
                            locale={locale}
                          />
                          <StatusBadge
                            status={tx.status}
                            domain="payment"
                            text={t(`table.status.${tx.status}`, tx.status)}
                          />
                          <span className={styles.txMeta}>
                            {formatDateTime(tx.paidAt || tx.createdAt, isArabic)}
                          </span>
                        </span>
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => setTransactionId(tx.id)}
                          title={t("actions.viewDetails", "View details")}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div className={styles.actions}>
            {link && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleRefresh}
                disabled={refreshMutation.isPending}
                title={
                  refreshMutation.isPending
                    ? t("links.actions.refreshing", "Checking…")
                    : t("links.actions.refresh", "Refresh status")
                }
              />
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              title={t("actions.close", "Close")}
            />
          </div>
        </div>
      </PopupLayout>
      {transactionId && (
        <PaymentDetailModal
          paymentId={transactionId}
          onClose={() => setTransactionId(null)}
        />
      )}
    </>
  );
}
