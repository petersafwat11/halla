"use client";
import { useTranslation } from "react-i18next";
import { useAdminPaymentDetail } from "@/hooks/admin";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import StatusBadge from "@/components/shared/StatusBadge";
import MoneyAmount from "@/ui/commen/MoneyAmount/MoneyAmount";
import { formatDateTime as sharedFormatDateTime } from "@halaa/shared/utils/locale";
import CopyableValue from "./CopyableValue";
import usePaymentLinkDialog from "./usePaymentLinkDialog";
import styles from "./PaymentDetailPopup.module.css";

const formatDateTime = (dateStr, isArabic) => {
  if (!dateStr) return "—";
  return sharedFormatDateTime(dateStr, isArabic ? "ar" : "en") || "—";
};

/** Provider source keys are never shown raw — an unmapped key falls back to a
 *  generic localized label instead of leaking e.g. `sadadbill`. */
const methodLabel = (paymentMethod, t) => {
  const type = paymentMethod?.type;
  if (!type) return "—";
  const label =
    t(`table.method.${type}`, { defaultValue: "" }) ||
    t("table.method.other", "Other method");
  return paymentMethod.last4 ? `${label} •••• ${paymentMethod.last4}` : label;
};

export default function PaymentDetailModal({ paymentId, onClose }) {
  const { t, i18n } = useTranslation("adminPayments");
  const isArabic = i18n.language === "ar";
  const { data: detailData, isLoading } = useAdminPaymentDetail(paymentId);
  const dialogRef = usePaymentLinkDialog(!!paymentId, onClose);
  if (!paymentId) return null;
  const payment = detailData?.data;
  const currency = payment?.currency || "SAR";
  const locale = isArabic ? "ar" : "en";
  const timeline = [
    ["detail.createdAt", "Created at", payment?.createdAt],
    ["detail.capturedAt", "Captured at", payment?.capturedAt],
    ["detail.voidedAt", "Voided at", payment?.voidedAt],
    ["detail.refundedAt", "Refunded at", payment?.refundedAt],
  ].filter(([, , value]) => value);

  return (
    <PopupLayout isOpen={!!paymentId} onClose={onClose} size="auto">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={t("detail.title", "Payment details")}
        className={styles.popup}
      >
        <div className={styles.header}>
          <div className={styles.headerMain}>
            <h2 className={styles.title}>{t("detail.title", "Payment details")}</h2>
            {payment && (
              <div className={styles.kicker}>
                <StatusBadge
                  status={payment.status}
                  domain="payment"
                  text={t(`table.status.${payment.status}`, payment.status)}
                />
                <span className={styles.reference} dir="ltr">
                  {payment.moyasarPaymentId || payment._id}
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

        {isLoading || !payment ? (
          <div className={styles.state}>
            <SimpleLoading />
          </div>
        ) : (
          <>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>{t("detail.amount", "Amount")}</span>
                <span className={styles.summaryValue}>
                  <MoneyAmount amount={payment.amount} currency={currency} locale={locale} />
                </span>
              </div>
              {payment.refundedAmount > 0 && (
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>
                    {t("detail.alreadyRefunded", "Already refunded")}
                  </span>
                  <span className={styles.summaryValue}>
                    <MoneyAmount
                      amount={payment.refundedAmount}
                      currency={currency}
                      locale={locale}
                    />
                  </span>
                </div>
              )}
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>{t("detail.method", "Payment method")}</span>
                <span className={styles.summaryValue}>{methodLabel(payment.paymentMethod, t)}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>{t("detail.createdAt", "Created at")}</span>
                <span className={styles.summaryValue}>
                  {formatDateTime(payment.createdAt, isArabic)}
                </span>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                {t("detail.sections.identifiers", "Identifiers")}
              </h3>
              <div className={styles.rows}>
                <div className={styles.row}>
                  <span className={styles.rowLabel}>{t("detail.id", "Payment ID")}</span>
                  <CopyableValue value={payment._id} />
                </div>
                <div className={styles.row}>
                  <span className={styles.rowLabel}>{t("detail.moyasarId", "Moyasar ID")}</span>
                  <CopyableValue value={payment.moyasarPaymentId} />
                </div>
                {payment.providerStatus && (
                  <div className={styles.row}>
                    <span className={styles.rowLabel}>
                      {t("detail.providerStatus", "Provider status")}
                    </span>
                    <span className={styles.rowMono} dir="ltr">
                      {payment.providerStatus}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {timeline.length > 0 && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  {t("detail.sections.timeline", "Timeline")}
                </h3>
                <div className={styles.rows}>
                  {timeline.map(([key, fallback, value]) => (
                    <div className={styles.row} key={key}>
                      <span className={styles.rowLabel}>{t(key, fallback)}</span>
                      <span className={styles.rowValue}>{formatDateTime(value, isArabic)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(payment.refunds) && payment.refunds.length > 0 && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>{t("detail.refunds", "Refunds")}</h3>
                <div className={styles.rows}>
                  {payment.refunds.map((r, i) => (
                    <div className={styles.txRow} key={r._id || `${r.createdAt || ""}-${i}`}>
                      <span className={styles.txMain}>
                        <MoneyAmount amount={r.amount} currency={currency} locale={locale} />
                        {r.reason ? <span className={styles.txMeta}>{r.reason}</span> : null}
                      </span>
                      <span className={styles.txMeta}>
                        {formatDateTime(r.createdAt, isArabic)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className={styles.actions}>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            title={t("actions.close", "Close")}
          />
        </div>
      </div>
    </PopupLayout>
  );
}
