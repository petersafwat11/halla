"use client";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { IoIosArrowForward } from "react-icons/io";
import { FaDownload, FaFilter } from "react-icons/fa";
import { useAdminPayments } from "@/hooks/reactQueryHooks/useAdmin";
import { paymentsAPI } from "@/services/adminDashboard";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import { useState } from "react";
import styles from "./AdminPaymentsClient.module.css";

const STATUS_VALUES = ["all", "completed", "pending", "failed"];

export default function AdminPaymentsClient() {
  const { t, i18n } = useTranslation("adminPayments");
  const router = useRouter();
  const { lang } = useParams();
  const searchParams = useSearchParams();
  const isArabic = i18n.language === "ar";
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState(false);

  const page = parseInt(searchParams.get("page") || "1");
  const status = searchParams.get("status") || "all";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  const filters = { page, limit: 20, ...(status !== "all" && { status }), ...(from && { from }), ...(to && { to }) };

  const { data, isLoading, error } = useAdminPayments(filters);
  const payments = data?.payments || data?.data?.payments || [];
  const stats = data?.stats || data?.data?.stats || {};
  const pagination = data?.pagination || data?.data?.pagination || { page, pages: 1, total: 0 };

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
      await paymentsAPI.export({ ...(status !== "all" && { status }), ...(from && { from }), ...(to && { to }) });
      toastUtils.success(isArabic ? "تم تصدير المدفوعات" : "Payments exported");
    } catch (err) {
      handleError(err, t);
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (amount, currency = "SAR") =>
    new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", { style: "currency", currency, minimumFractionDigits: 0 }).format(amount || 0);

  const formatDate = (dateStr) =>
    dateStr ? new Date(dateStr).toLocaleDateString(isArabic ? "ar-SA" : "en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";

  const statusBadgeStyle = (s) => ({
    completed: { background: "#e8f5e9", color: "#2e7d32" },
    pending:   { background: "#fff3e0", color: "#e65100" },
    failed:    { background: "#ffebee", color: "#c62828" },
  }[s] || { background: "#f5f5f5", color: "#666" });

  const statItems = [
    { key: "totalRevenue",  label: t("stats.currentMonthRevenue", "Total Revenue"),  value: formatCurrency(stats.totalRevenue), color: "#2a8c5b" },
    { key: "completed",     label: t("table.status.successful", "Completed"),        value: stats.completed || 0,               color: "#2e7d32" },
    { key: "pending",       label: t("table.status.pending", "Pending"),             value: stats.pending || 0,                 color: "#e65100" },
    { key: "failed",        label: t("table.status.failed", "Failed"),               value: stats.failed || 0,                  color: "#c62828" },
  ];

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
        <p className={styles.pageSubtitle}>{t("header.subtitle", "Manage and track all subscription payments")}</p>
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
        <div className={styles.error}>{error.message || t("header.subtitle", "Failed to load payments")}</div>
      ) : payments.length === 0 ? (
        <div className={styles.empty}>{t("table.searchPlaceholder", "No payments found")}</div>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead className={styles.tableHead}>
                <tr style={{ textAlign: isArabic ? "right" : "left" }}>
                  <th className={styles.th}>{t("table.columns.name", "Host")}</th>
                  <th className={styles.th}>{t("table.columns.planType", "Plan")}</th>
                  <th className={styles.th}>{t("table.columns.amount", "Amount")}</th>
                  <th className={styles.th}>{t("table.columns.paymentMethod", "Billing")}</th>
                  <th className={styles.th}>{t("table.columns.status", "Status")}</th>
                  <th className={styles.th}>{t("table.columns.createdAt", "Date")}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const badgeStyle = statusBadgeStyle(p.status);
                  return (
                    <tr key={p._id}>
                      <td className={styles.td}>{p.hostName || "—"}</td>
                      <td className={styles.td}>{p.description || "—"}</td>
                      <td className={`${styles.td} ${styles.tdAmount}`}>{formatCurrency(p.amount, p.currency)}</td>
                      <td className={styles.td}>{p.billingCycle || "—"}</td>
                      <td className={styles.td}>
                        <span className={styles.statusBadge} style={badgeStyle}>
                          {t(`table.status.${p.status}`, p.status) || p.status}
                        </span>
                      </td>
                      <td className={`${styles.td} ${styles.tdMuted}`}>{formatDate(p.createdAt)}</td>
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
    </div>
  );
}
