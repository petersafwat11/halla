"use client";
import { useTranslation } from "react-i18next";
import styles from "./AdminPaymentsClient.module.css";

const STATUS_COLOR = {
  completed: { background: "#e8f5e9", color: "#2e7d32" },
  pending: { background: "#fff3e0", color: "#e65100" },
  failed: { background: "#ffebee", color: "#c62828" },
  refunded: { background: "#e3f2fd", color: "#1565c0" },
};

const formatCurrency = (amount, currency = "SAR", isArabic) =>
  new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount || 0);

const formatDate = (dateStr, isArabic) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString(isArabic ? "ar-SA" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

export default function PaymentsTable({ payments, canWrite, onAction, onView }) {
  const { t, i18n } = useTranslation("adminPayments");
  const isArabic = i18n.language === "ar";

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead className={styles.tableHead}>
          <tr style={{ textAlign: isArabic ? "right" : "left" }}>
            <th className={styles.th}>{t("table.columns.name", "Host")}</th>
            <th className={styles.th}>
              {t("table.columns.planType", "Description")}
            </th>
            <th className={styles.th}>{t("table.columns.amount", "Amount")}</th>
            <th className={styles.th}>{t("table.columns.method", "Method")}</th>
            <th className={styles.th}>
              {t("table.columns.transactionId", "Tx ID")}
            </th>
            <th className={styles.th}>{t("table.columns.status", "Status")}</th>
            <th className={styles.th}>{t("table.columns.createdAt", "Date")}</th>
            <th className={styles.th}>
              {t("table.columns.actions", "Actions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => {
            const badgeStyle = STATUS_COLOR[p.status] || {
              background: "#f5f5f5",
              color: "#666",
            };
            const refundable =
              p.status === "completed" || p.refundedAmount > 0;
            const captureable = p.providerStatus === "authorized";
            const voidable = p.providerStatus === "authorized";
            return (
              <tr key={p._id}>
                <td className={styles.td}>{p.hostName || "—"}</td>
                <td className={styles.td}>{p.description || "—"}</td>
                <td className={`${styles.td} ${styles.tdAmount}`}>
                  {formatCurrency(p.amount, p.currency, isArabic)}
                  {p.refundedAmount > 0 && (
                    <span className={styles.refundedTag}>
                      ({t("table.refundedTag", "refunded")}{" "}
                      {formatCurrency(p.refundedAmount, p.currency, isArabic)})
                    </span>
                  )}
                </td>
                <td className={styles.td}>
                  {p.paymentMethod
                    ? `${t(
                        `table.method.${p.paymentMethod}`,
                        p.paymentMethod
                      )}${
                        p.paymentMethodLast4
                          ? ` •••• ${p.paymentMethodLast4}`
                          : ""
                      }`
                    : "—"}
                </td>
                <td className={`${styles.td} ${styles.txCell}`}>
                  {p.moyasarPaymentId || "—"}
                </td>
                <td className={styles.td}>
                  <span className={styles.statusBadge} style={badgeStyle}>
                    {t(`table.status.${p.status}`, p.status) || p.status}
                  </span>
                </td>
                <td className={`${styles.td} ${styles.tdMuted}`}>
                  {formatDate(p.createdAt, isArabic)}
                </td>
                <td className={styles.td}>
                  <div className={styles.actionRow}>
                    <button
                      type="button"
                      className={styles.pageBtn}
                      onClick={() => onView(p._id)}
                      title={t("actions.viewDetails", "View details")}
                    >
                      {t("actions.viewDetails", "Details")}
                    </button>
                    {canWrite && refundable && (
                      <button
                        type="button"
                        className={styles.pageBtn}
                        onClick={() => onAction(p, "refund")}
                      >
                        {t("actions.refund", "Refund")}
                      </button>
                    )}
                    {canWrite && captureable && (
                      <button
                        type="button"
                        className={styles.pageBtn}
                        onClick={() => onAction(p, "capture")}
                      >
                        {t("actions.capture", "Capture")}
                      </button>
                    )}
                    {canWrite && voidable && (
                      <button
                        type="button"
                        className={styles.pageBtn}
                        onClick={() => onAction(p, "void")}
                      >
                        {t("actions.void", "Void")}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
