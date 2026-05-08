"use client";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { IoIosArrowForward } from "react-icons/io";
import {
  useAdminPayments,
  useAdminPaymentsExport,
} from "@/hooks/reactQueryHooks/useAdmin";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import useAuthStore from "@/stores/authStore";
import PaymentsToolbar from "./PaymentsToolbar";
import PaymentsFiltersPanel from "./PaymentsFiltersPanel";
import PaymentsTable from "./PaymentsTable";
import PaymentActionModal from "./PaymentActionModal";
import PaymentDetailModal from "./PaymentDetailModal";
import usePaymentActions from "./usePaymentActions";
import styles from "./AdminPaymentsClient.module.css";

const ADMIN_WRITE_ROLES = new Set(["super_admin", "admin"]);

const formatCurrency = (amount, isArabic, currency = "SAR") =>
  new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount || 0);

export default function AdminPaymentsClient() {
  const { user } = useAuthStore();
  const { t, i18n } = useTranslation("adminPayments");
  const router = useRouter();
  const { lang } = useParams();
  const searchParams = useSearchParams();
  const isArabic = i18n.language === "ar";

  const [showFilters, setShowFilters] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const actions = usePaymentActions();
  const exportMutation = useAdminPaymentsExport();

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
  const payments = data?.data?.payments || [];
  const stats = data?.data?.stats || {};
  const pagination = data?.data?.pagination || { page, pages: 1, total: 0 };

  const canWrite = ADMIN_WRITE_ROLES.has(user?.role);

  const updateParams = useCallback(
    (updates) => {
      const params = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([k, v]) => {
        if (v) params.set(k, v);
        else params.delete(k);
      });
      if (!Object.keys(updates).includes("page")) params.set("page", "1");
      router.push(`?${params.toString()}`);
    },
    [searchParams, router]
  );

  const handleExport = async () => {
    try {
      await exportMutation.mutateAsync({
        ...(status !== "all" && { status }),
        ...(from && { from }),
        ...(to && { to }),
      });
      toastUtils.success(t("export.success", "Payments exported"));
    } catch (err) {
      handleError(err, t);
    }
  };

  const statItems = [
    {
      key: "totalRevenue",
      label: t("stats.currentMonthRevenue", "Total Revenue"),
      value: formatCurrency(stats.totalRevenue, isArabic),
      color: "#2a8c5b",
    },
    {
      key: "completed",
      label: t("table.status.completed", "Completed"),
      value: stats.completed || 0,
      color: "#2e7d32",
    },
    {
      key: "pending",
      label: t("table.status.pending", "Pending"),
      value: stats.pending || 0,
      color: "#e65100",
    },
    {
      key: "failed",
      label: t("table.status.failed", "Failed"),
      value: stats.failed || 0,
      color: "#c62828",
    },
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
        <p className={styles.pageSubtitle}>
          {t("header.subtitle", "Manage and track all subscription payments")}
        </p>
      </div>

      <div className={styles.statsGrid}>
        {statItems.map((s) => (
          <div key={s.key} className={styles.statCard}>
            <div className={styles.statLabel}>{s.label}</div>
            <div className={styles.statValue} style={{ color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <PaymentsToolbar
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters((v) => !v)}
        onExport={handleExport}
        exporting={exportMutation.isLoading}
      />

      {showFilters && (
        <PaymentsFiltersPanel
          status={status}
          from={from}
          to={to}
          onChange={updateParams}
        />
      )}

      {isLoading ? (
        <SimpleLoading />
      ) : error ? (
        <div className={styles.error}>
          {error.message || t("errors.loadFailed", "Failed to load payments")}
        </div>
      ) : payments.length === 0 ? (
        <div className={styles.empty}>
          {t("empty.title", "No payments found")}
        </div>
      ) : (
        <>
          <PaymentsTable
            payments={payments}
            canWrite={canWrite}
            onAction={(payment, type) =>
              actions.setActionPayment({ payment, type })
            }
            onView={(id) => setDetailId(id)}
          />

          {pagination.pages > 1 && (
            <div className={styles.pagination}>
              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => updateParams({ page: String(page - 1) })}
                disabled={page <= 1}
              >
                {t("pagination.prev", "Previous")}
              </button>
              <span className={styles.pageInfo}>
                {page} / {pagination.pages}
              </span>
              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => updateParams({ page: String(page + 1) })}
                disabled={page >= pagination.pages}
              >
                {t("pagination.next", "Next")}
              </button>
            </div>
          )}
        </>
      )}

      <PaymentActionModal
        actionPayment={actions.actionPayment}
        amount={actions.amount}
        reason={actions.reason}
        onAmountChange={actions.setAmount}
        onReasonChange={actions.setReason}
        onClose={actions.close}
        onConfirm={actions.submit}
        busy={actions.busy}
      />

      <PaymentDetailModal
        paymentId={detailId}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}
