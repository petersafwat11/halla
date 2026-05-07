"use client";
import { useCallback, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { IoIosArrowForward } from "react-icons/io";
import { FaDownload, FaFilter } from "react-icons/fa";
import {
  useAdminPayments,
  useAdminPaymentDetail,
  useAdminPaymentRefund,
  useAdminPaymentCapture,
  useAdminPaymentVoid,
} from "@/hooks/reactQueryHooks/useAdmin";
import { paymentsAPI } from "@/services/adminDashboard";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import useAuthStore from "@/stores/authStore";
import styles from "./AdminPaymentsClient.module.css";

const STATUS_VALUES = ["all", "completed", "pending", "failed", "refunded"];

// Mint a UUID v4 — used once per modal session for the Idempotency-Key.
const newUuid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function AdminPaymentsClient() {
  const { user } = useAuthStore();
  const userRole = user?.role;
  const { t, i18n } = useTranslation("adminPayments");
  const router = useRouter();
  const { lang } = useParams();
  const searchParams = useSearchParams();
  const isArabic = i18n.language === "ar";
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [actionPayment, setActionPayment] = useState(null); // { payment, type: 'refund' | 'capture' | 'void' }
  const [detailId, setDetailId] = useState(null);
  const [actionAmount, setActionAmount] = useState("");
  const [actionReason, setActionReason] = useState("");

  // Stable per-modal idempotency key. Re-mounting the modal mints a new
  // UUID; submitting twice from the same modal (double-click) reuses it.
  const idempotencyKey = useMemo(
    () => (actionPayment ? newUuid() : null),
    [actionPayment?.payment?._id, actionPayment?.type]
  );

  const refundMutation = useAdminPaymentRefund();
  const captureMutation = useAdminPaymentCapture();
  const voidMutation = useAdminPaymentVoid();
  const { data: detailData, isLoading: detailLoading } = useAdminPaymentDetail(detailId);

  const page = parseInt(searchParams.get("page") || "1");
  const status = searchParams.get("status") || "all";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  const filters = {
    page,
    limit: 20,
    ...(status !== "all" && { status }),
    ...(from && { from }),
    ...(to && { to }),
  };

  const { data, isLoading, error } = useAdminPayments(filters);
  const payments = data?.payments || data?.data?.payments || [];
  const stats = data?.stats || data?.data?.stats || {};
  const pagination = data?.pagination || data?.data?.pagination || { page, pages: 1, total: 0 };

  // Only SUPER_ADMIN / ADMIN may issue write actions (§11 RBAC matrix).
  const canWrite = ["super_admin", "admin"].includes(String(userRole || "").toLowerCase());

  const updateParams = useCallback((updates) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v); else params.delete(k);
    });
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  }, [searchParams, router]);

  const handleExport = async () => {
    try {
      setExporting(true);
      await paymentsAPI.export({
        ...(status !== "all" && { status }),
        ...(from && { from }),
        ...(to && { to }),
      });
      toastUtils.success(t("adminPayments.exportSuccess", "Payments exported"));
    } catch (err) {
      handleError(err, t);
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (amount, currency = "SAR") =>
    new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(amount || 0);

  const formatDate = (dateStr) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString(isArabic ? "ar-SA" : "en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "—";

  const statusBadgeStyle = (s) =>
    ({
      completed: { background: "#e8f5e9", color: "#2e7d32" },
      pending: { background: "#fff3e0", color: "#e65100" },
      failed: { background: "#ffebee", color: "#c62828" },
      refunded: { background: "#e3f2fd", color: "#1565c0" },
    }[s] || { background: "#f5f5f5", color: "#666" });

  const statItems = [
    { key: "totalRevenue", label: t("stats.currentMonthRevenue", "Total Revenue"), value: formatCurrency(stats.totalRevenue), color: "#2a8c5b" },
    { key: "completed", label: t("table.status.completed", "Completed"), value: stats.completed || 0, color: "#2e7d32" },
    { key: "pending", label: t("table.status.pending", "Pending"), value: stats.pending || 0, color: "#e65100" },
    { key: "failed", label: t("table.status.failed", "Failed"), value: stats.failed || 0, color: "#c62828" },
  ];

  const closeAction = () => {
    setActionPayment(null);
    setActionAmount("");
    setActionReason("");
  };

  const submitAction = async () => {
    if (!actionPayment) return;
    const { payment, type } = actionPayment;
    try {
      if (type === "refund") {
        const amt = actionAmount ? Number(actionAmount) : undefined;
        await refundMutation.mutateAsync({
          id: payment._id,
          amount: typeof amt === "number" && !Number.isNaN(amt) ? amt : undefined,
          reason: actionReason || undefined,
          idempotencyKey,
        });
        toastUtils.success(isArabic ? "تم الاسترداد" : "Refund issued");
      } else if (type === "capture") {
        const amt = actionAmount ? Number(actionAmount) : undefined;
        await captureMutation.mutateAsync({
          id: payment._id,
          amount: typeof amt === "number" && !Number.isNaN(amt) ? amt : undefined,
          idempotencyKey,
        });
        toastUtils.success(isArabic ? "تم القبض" : "Payment captured");
      } else if (type === "void") {
        await voidMutation.mutateAsync({ id: payment._id, idempotencyKey });
        toastUtils.success(isArabic ? "تم الإلغاء" : "Payment voided");
      }
      closeAction();
    } catch (err) {
      handleError(err, t);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>
          <IoIosArrowForward
            className={styles.backIcon}
            onClick={() => router.push(`/${lang}/admin-dash`)}
            style={{ transform: isArabic ? "rotate(0deg)" : "rotate(180deg)" }}
          />
          {t("header.title", "Payments")}
        </h1>
        <p className={styles.pageSubtitle}>
          {t("header.subtitle", "Manage and track all subscription payments")}
        </p>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        {statItems.map((s) => (
          <div key={s.key} className={styles.statCard}>
            <div className={styles.statLabel}>{s.label}</div>
            <div className={styles.statValue} style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`${styles.filterBtn} ${showFilters ? styles.filterBtnActive : ""}`}
          >
            <FaFilter /> {t("table.filter", "Filters")}
          </button>
        </div>
        <button onClick={handleExport} disabled={exporting} className={styles.exportBtn}>
          <FaDownload /> {exporting ? "..." : t("table.export", "Export")}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className={styles.filtersPanel}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>{t("table.filter", "Status")}</label>
            <select
              className={styles.filterSelect}
              value={status}
              onChange={(e) => updateParams({ status: e.target.value })}
            >
              {STATUS_VALUES.map((v) => (
                <option key={v} value={v}>{t(`table.status.${v}`, v)}</option>
              ))}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>{t("dateRange.all", "From")}</label>
            <input
              type="date"
              className={styles.filterInput}
              value={from}
              onChange={(e) => updateParams({ from: e.target.value })}
            />
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>{t("header.dateRange", "To")}</label>
            <input
              type="date"
              className={styles.filterInput}
              value={to}
              onChange={(e) => updateParams({ to: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <SimpleLoading />
      ) : error ? (
        <div className={styles.error}>
          {error.message || t("header.subtitle", "Failed to load payments")}
        </div>
      ) : payments.length === 0 ? (
        <div className={styles.empty}>
          {t("table.searchPlaceholder", "No payments found")}
        </div>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead className={styles.tableHead}>
                <tr style={{ textAlign: isArabic ? "right" : "left" }}>
                  <th className={styles.th}>{t("table.columns.name", "Host")}</th>
                  <th className={styles.th}>{t("table.columns.planType", "Description")}</th>
                  <th className={styles.th}>{t("table.columns.amount", "Amount")}</th>
                  <th className={styles.th}>{t("table.columns.method", "Method")}</th>
                  <th className={styles.th}>{t("table.columns.transactionId", "Tx ID")}</th>
                  <th className={styles.th}>{t("table.columns.status", "Status")}</th>
                  <th className={styles.th}>{t("table.columns.createdAt", "Date")}</th>
                  <th className={styles.th}>{t("table.columns.actions", "Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const badgeStyle = statusBadgeStyle(p.status);
                  const refundable = ["completed"].includes(p.status) || p.refundedAmount > 0;
                  const captureable = p.providerStatus === "authorized";
                  const voidable = p.providerStatus === "authorized";
                  return (
                    <tr key={p._id}>
                      <td className={styles.td}>{p.hostName || "—"}</td>
                      <td className={styles.td}>{p.description || "—"}</td>
                      <td className={`${styles.td} ${styles.tdAmount}`}>
                        {formatCurrency(p.amount, p.currency)}
                        {p.refundedAmount > 0 && (
                          <span style={{ marginLeft: 6, color: "#1565c0", fontSize: 12 }}>
                            ({t("table.refundedTag", "refunded")} {formatCurrency(p.refundedAmount, p.currency)})
                          </span>
                        )}
                      </td>
                      <td className={styles.td}>
                        {p.paymentMethod
                          ? `${t(`table.method.${p.paymentMethod}`, p.paymentMethod)}${p.paymentMethodLast4 ? ` •••• ${p.paymentMethodLast4}` : ""}`
                          : "—"}
                      </td>
                      <td className={styles.td} style={{ fontFamily: "monospace", fontSize: 12 }}>
                        {p.moyasarPaymentId || "—"}
                      </td>
                      <td className={styles.td}>
                        <span className={styles.statusBadge} style={badgeStyle}>
                          {t(`table.status.${p.status}`, p.status) || p.status}
                        </span>
                      </td>
                      <td className={`${styles.td} ${styles.tdMuted}`}>{formatDate(p.createdAt)}</td>
                      <td className={styles.td}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className={styles.pageBtn}
                            onClick={() => setDetailId(p._id)}
                            title={t("actions.viewDetails", "View details")}
                          >
                            {t("actions.viewDetails", "Details")}
                          </button>
                          {canWrite && refundable && (
                            <button
                              type="button"
                              className={styles.pageBtn}
                              onClick={() => setActionPayment({ payment: p, type: "refund" })}
                            >
                              {t("actions.refund", "Refund")}
                            </button>
                          )}
                          {canWrite && captureable && (
                            <button
                              type="button"
                              className={styles.pageBtn}
                              onClick={() => setActionPayment({ payment: p, type: "capture" })}
                            >
                              {t("actions.capture", "Capture")}
                            </button>
                          )}
                          {canWrite && voidable && (
                            <button
                              type="button"
                              className={styles.pageBtn}
                              onClick={() => setActionPayment({ payment: p, type: "void" })}
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

          {pagination.pages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                onClick={() => updateParams({ page: String(page - 1) })}
                disabled={page <= 1}
              >
                {isArabic ? "السابق" : "Previous"}
              </button>
              <span className={styles.pageInfo}>{page} / {pagination.pages}</span>
              <button
                className={styles.pageBtn}
                onClick={() => updateParams({ page: String(page + 1) })}
                disabled={page >= pagination.pages}
              >
                {isArabic ? "التالي" : "Next"}
              </button>
            </div>
          )}
        </>
      )}

      {/* Action confirmation modal */}
      {actionPayment && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={closeAction}
        >
          <div
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 12,
              minWidth: 320,
              maxWidth: 480,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0 }}>
              {actionPayment.type === "refund" &&
                t("actions.confirmRefund", "Refund {{amount}} {{currency}}?", {
                  amount: actionAmount || actionPayment.payment.amount,
                  currency: actionPayment.payment.currency || "SAR",
                })}
              {actionPayment.type === "capture" &&
                t("actions.confirmCapture", "Capture this authorized payment?")}
              {actionPayment.type === "void" &&
                t("actions.confirmVoid", "Void this authorized payment?")}
            </h2>
            {actionPayment.type === "refund" && (
              <>
                <input
                  type="number"
                  placeholder={t("actions.refundAmountPlaceholder", "Amount (blank = full)")}
                  value={actionAmount}
                  onChange={(e) => setActionAmount(e.target.value)}
                  style={{ width: "100%", padding: 8, marginBottom: 8 }}
                />
                <input
                  type="text"
                  placeholder={t("actions.reasonPlaceholder", "Reason")}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  style={{ width: "100%", padding: 8, marginBottom: 12 }}
                />
              </>
            )}
            {actionPayment.type === "capture" && (
              <input
                type="number"
                placeholder={t("actions.captureAmountPlaceholder", "Amount (blank = full)")}
                value={actionAmount}
                onChange={(e) => setActionAmount(e.target.value)}
                style={{ width: "100%", padding: 8, marginBottom: 12 }}
              />
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={closeAction}>
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={submitAction}
                disabled={
                  refundMutation.isLoading ||
                  captureMutation.isLoading ||
                  voidMutation.isLoading
                }
                style={{ background: "#2e7d32", color: "#fff", padding: "8px 16px" }}
              >
                {isArabic ? "تأكيد" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment detail modal */}
      {detailId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setDetailId(null)}
        >
          <div
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 12,
              minWidth: 360,
              maxWidth: 640,
              maxHeight: "80vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0 }}>
              {t("actions.viewDetails", "Payment details")}
            </h2>
            {detailLoading ? (
              <SimpleLoading />
            ) : (
              <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
                {JSON.stringify(detailData?.data || detailData, null, 2)}
              </pre>
            )}
            <button
              onClick={() => setDetailId(null)}
              style={{ marginTop: 12 }}
            >
              {isArabic ? "إغلاق" : "Close"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
