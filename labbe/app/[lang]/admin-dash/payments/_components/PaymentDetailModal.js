"use client";
import { useTranslation } from "react-i18next";
import { useAdminPaymentDetail } from "@/hooks/admin";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import styles from "./AdminPaymentsClient.module.css";

const formatCurrency = (amount, currency = "SAR", isArabic) =>
  amount === undefined || amount === null
    ? "—"
    : new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
      }).format(amount || 0);

const formatDateTime = (dateStr, isArabic) =>
  dateStr
    ? new Date(dateStr).toLocaleString(isArabic ? "ar-SA" : "en-US")
    : "—";

export default function PaymentDetailModal({ paymentId, onClose }) {
  const { t, i18n } = useTranslation("adminPayments");
  const isArabic = i18n.language === "ar";
  const { data: detailData, isLoading } = useAdminPaymentDetail(paymentId);
  if (!paymentId) return null;
  const payment = detailData?.data;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalBodyWide}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className={styles.modalTitle}>
          {t("detail.title", "Payment details")}
        </h2>
        {isLoading || !payment ? (
          <SimpleLoading />
        ) : (
          <>
            <div className={styles.detailGrid}>
              <span className={styles.detailLabel}>
                {t("detail.id", "Payment ID")}
              </span>
              <span className={styles.detailMono}>{payment._id}</span>

              <span className={styles.detailLabel}>
                {t("detail.status", "Status")}
              </span>
              <span className={styles.detailValue}>
                {t(`table.status.${payment.status}`, payment.status)}
              </span>

              <span className={styles.detailLabel}>
                {t("detail.amount", "Amount")}
              </span>
              <span className={styles.detailValue}>
                {formatCurrency(payment.amount, payment.currency, isArabic)}
                {payment.refundedAmount > 0 && (
                  <span className={styles.refundedTag}>
                    ({t("table.refundedTag", "refunded")}{" "}
                    {formatCurrency(
                      payment.refundedAmount,
                      payment.currency,
                      isArabic
                    )}
                    )
                  </span>
                )}
              </span>

              <span className={styles.detailLabel}>
                {t("detail.method", "Payment method")}
              </span>
              <span className={styles.detailValue}>
                {payment.paymentMethod?.type
                  ? `${t(
                      `table.method.${payment.paymentMethod.type}`,
                      payment.paymentMethod.type
                    )}${
                      payment.paymentMethod.last4
                        ? ` •••• ${payment.paymentMethod.last4}`
                        : ""
                    }`
                  : "—"}
              </span>

              <span className={styles.detailLabel}>
                {t("detail.moyasarId", "Moyasar ID")}
              </span>
              <span className={styles.detailMono}>
                {payment.moyasarPaymentId || "—"}
              </span>

              <span className={styles.detailLabel}>
                {t("detail.createdAt", "Created at")}
              </span>
              <span className={styles.detailValue}>
                {formatDateTime(payment.createdAt, isArabic)}
              </span>

              {payment.capturedAt && (
                <>
                  <span className={styles.detailLabel}>
                    {t("detail.capturedAt", "Captured at")}
                  </span>
                  <span className={styles.detailValue}>
                    {formatDateTime(payment.capturedAt, isArabic)}
                  </span>
                </>
              )}
              {payment.voidedAt && (
                <>
                  <span className={styles.detailLabel}>
                    {t("detail.voidedAt", "Voided at")}
                  </span>
                  <span className={styles.detailValue}>
                    {formatDateTime(payment.voidedAt, isArabic)}
                  </span>
                </>
              )}
              {payment.refundedAt && (
                <>
                  <span className={styles.detailLabel}>
                    {t("detail.refundedAt", "Refunded at")}
                  </span>
                  <span className={styles.detailValue}>
                    {formatDateTime(payment.refundedAt, isArabic)}
                  </span>
                </>
              )}
            </div>

            {Array.isArray(payment.refunds) && payment.refunds.length > 0 && (
              <div className={styles.detailSection}>
                <div className={styles.detailSectionTitle}>
                  {t("detail.refunds", "Refunds")}
                </div>
                {payment.refunds.map((r, i) => (
                  <div
                    key={r._id || `${r.createdAt || ""}-${i}`}
                    className={styles.refundRow}
                  >
                    <span>
                      {formatCurrency(r.amount, payment.currency, isArabic)}
                      {r.reason ? ` — ${r.reason}` : ""}
                    </span>
                    <span className={styles.detailMono}>
                      {formatDateTime(r.createdAt, isArabic)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={onClose}
                className={styles.pageBtn}
              >
                {t("actions.close", "Close")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
