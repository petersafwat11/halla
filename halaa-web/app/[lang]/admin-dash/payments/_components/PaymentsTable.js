"use client";

import { useMemo, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { usePageAccess } from "@/hooks/usePageAccess";
import useAuthStore, { USER_ROLES } from "@/stores/authStore";
import {
  useAdminPayments,
  useAdminPaymentsExport,
} from "@/hooks/admin";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";
import { normalizePaymentsFilters } from "@/utils/filterNormalizer";
import Table from "@/ui/commen/new-table/Table";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import PaymentActionModal from "./PaymentActionModal";
import PaymentDetailModal from "./PaymentDetailModal";
import usePaymentActions from "./usePaymentActions";
import { getStatusVisual } from "@/utils/statusColors";
import {
  formatCurrency as sharedFormatCurrency,
  formatDate as sharedFormatDate,
} from "@halaa/shared/utils/locale";
import styles from "./PaymentsTable.module.css";

const formatCurrency = (amount, currency = "SAR", isArabic) =>
  sharedFormatCurrency(amount || 0, isArabic ? "ar" : "en", currency);

const formatDate = (dateStr, isArabic) =>
  dateStr
    ? sharedFormatDate(dateStr, isArabic ? "ar" : "en", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }) || "—"
    : "—";

export default function PaymentsTable() {
  const { t, i18n } = useTranslation("adminPayments");
  const isArabic = i18n.language === "ar";
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canUpdate, canDelete } = usePageAccess("payments");
  // Refunds are restricted to platform super-admin / admin — other roles get
  // a backend 403 even when they have generic `canUpdate` on payments.
  // Gate the refund button to match so it doesn't render a guaranteed-403.
  const userRole = useAuthStore((s) => s.user?.role);
  const canRefund =
    userRole === USER_ROLES.SUPER_ADMIN || userRole === USER_ROLES.ADMIN;

  const [detailId, setDetailId] = useState(null);
  const actions = usePaymentActions();
  const exportMutation = useAdminPaymentsExport();

  const filters = useMemo(() => normalizePaymentsFilters(searchParams, { limit: 20 }), [searchParams]);

  const { data, isLoading, error } = useAdminPayments(filters);
  // Wrap the `|| []` default in its own `useMemo` so the
  // `tableData` memo at the bottom of the file actually caches across
  // renders. The bare `data?.data?.payments || []` form returns a new
  // array reference every render and defeats memoization.
  const payments = useMemo(
    () => data?.data?.payments || [],
    [data]
  );
  const pagination = data?.data?.pagination || { page: 1, pages: 1, total: 0 };

  const handlePageChange = useCallback(
    (page) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(page));
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  const handleSearchChange = useCallback(
    (query) => {
      const params = new URLSearchParams(searchParams.toString());
      if (query) {
        params.set("search", query);
      } else {
        params.delete("search");
      }
      params.set("page", "1");
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  const handleExport = useCallback(async () => {
    try {
      await exportMutation.mutateAsync({
        status: filters.status,
        from: filters.from,
        to: filters.to,
      });
      toastUtils.success(t("export.success", "Payments exported"));
    } catch (err) {
      handleError(err, t);
    }
  }, [exportMutation, filters, t]);

  const handleStatusFilter = useCallback(
    (status) => {
      const params = new URLSearchParams(searchParams.toString());
      if (status) {
        params.set("status", status);
      } else {
        params.delete("status");
      }
      params.set("page", "1");
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  const getRowActions = useCallback(
    (row) => {
      const actionsList = [];

      actionsList.push({
        type: "dropdown",
        text: t("actions.viewDetails", "View details"),
        onClick: () => setDetailId(row.id),
      });

      if (canUpdate) {
        const refundable = row.status === "completed" || row.providerStatus === "partially_refunded";
        const captureable = row.providerStatus === "authorized";
        const voidable = row.providerStatus === "authorized";

        if (refundable && canRefund) {
          actionsList.push({
            type: "dropdown",
            text: t("actions.refund", "Refund"),
            onClick: () =>
              actions.setActionPayment({ payment: row.original, type: "refund" }),
          });
        }
        if (captureable) {
          actionsList.push({
            type: "dropdown",
            text: t("actions.capture", "Capture"),
            onClick: () =>
              actions.setActionPayment({ payment: row.original, type: "capture" }),
          });
        }
        if (voidable) {
          actionsList.push({
            type: "dropdown",
            text: t("actions.void", "Void"),
            onClick: () =>
              actions.setActionPayment({ payment: row.original, type: "void" }),
          });
        }
      }

      return actionsList;
    },
    [canUpdate, canRefund, t, actions]
  );

  const renderCell = useCallback(
    (key, value, row) => {
      if (key === "status") {
        const { fg, bg } = getStatusVisual(value, "payment");
        return (
          <span
            style={{
              display: "inline-flex",
              padding: "0.2rem 1rem",
              borderRadius: "999px",
              fontSize: "1.2rem",
              fontWeight: 500,
              background: bg,
              color: fg,
            }}
          >
            {t(`table.status.${value}`, value)}
          </span>
        );
      }
      if (key === "amount") {
        return (
          <span>
            {formatCurrency(value, row.currency, isArabic)}
            {row.refundedAmount > 0 && (
              <span
                style={{
                  marginLeft: "0.6rem",
                  color: "#1565c0",
                  fontSize: "1.2rem",
                }}
              >
                ({t("table.refundedTag", "refunded")}{" "}
                {formatCurrency(row.refundedAmount, row.currency, isArabic)})
              </span>
            )}
          </span>
        );
      }
      if (key === "createdAt" && value) {
        return formatDate(value, isArabic);
      }
      if (key === "paymentMethod" && value) {
        return `${t(`table.method.${value}`, value)}${
          row.paymentMethodLast4 ? ` •••• ${row.paymentMethodLast4}` : ""
        }`;
      }
      return value;
    },
    [t, isArabic]
  );

  const tableData = useMemo(
    () =>
      payments.map((p) => ({
        id: p._id,
        hostName: p.hostName || "—",
        description: p.description || "—",
        amount: p.amount,
        currency: p.currency,
        refundedAmount: p.refundedAmount,
        paymentMethod: p.paymentMethod,
        paymentMethodLast4: p.paymentMethodLast4,
        moyasarPaymentId: p.moyasarPaymentId || "—",
        status: p.status,
        createdAt: p.createdAt,
        original: p,
        providerStatus: p.providerStatus,
      })),
    [payments]
  );

  if (isLoading) return <SimpleLoading />;

  if (error) {
    return (
      <div className={styles.errorState}>
        <p>{t("errors.loadFailed", "Failed to load payments")}</p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.container}>
        <Table
          mode="server"
          title={t("table.title", "Transactions List")}
          headers={[
            t("table.columns.name", "Host"),
            t("table.columns.planType", "Description"),
            t("table.columns.amount", "Amount"),
            t("table.columns.method", "Method"),
            t("table.columns.transactionId", "Tx ID"),
            t("table.columns.status", "Status"),
            t("table.columns.createdAt", "Date"),
          ]}
          headerKeys={[
            "hostName",
            "description",
            "amount",
            "paymentMethod",
            "moyasarPaymentId",
            "status",
            "createdAt",
          ]}
          data={tableData}
          searchValue={filters.search}
          onSearchChange={handleSearchChange}
          activeFilter={filters.status}
          onFilterChange={handleStatusFilter}
          renderCell={renderCell}
          getRowActions={getRowActions}
          showCheckboxes={canUpdate || canDelete}
          showExport={true}
          onExportClick={handleExport}
          filterOptions={[
            {
              label: t("table.status.all", "All"),
              value: "",
              text: t("table.status.all", "All"),
              onClick: () => handleStatusFilter(""),
            },
            {
              label: t("table.status.completed", "Completed"),
              value: "completed",
              text: t("table.status.completed", "Completed"),
              onClick: () => handleStatusFilter("completed"),
            },
            {
              label: t("table.status.pending", "Pending"),
              value: "pending",
              text: t("table.status.pending", "Pending"),
              onClick: () => handleStatusFilter("pending"),
            },
            {
              label: t("table.status.failed", "Failed"),
              value: "failed",
              text: t("table.status.failed", "Failed"),
              onClick: () => handleStatusFilter("failed"),
            },
            {
              label: t("table.status.refunded", "Refunded"),
              value: "refunded",
              text: t("table.status.refunded", "Refunded"),
              onClick: () => handleStatusFilter("refunded"),
            },
          ]}
          pagination={{
            currentPage: parseInt(filters.page, 10) || 1,
            totalPages: pagination.pages || 1,
            totalItems: pagination.total || 0,
            onPageChange: handlePageChange,
          }}
        />
      </div>

      <PaymentActionModal
        actionPayment={actions.actionPayment}
        onClose={actions.close}
        onConfirm={actions.submit}
        busy={actions.busy}
      />

      <PaymentDetailModal
        paymentId={detailId}
        onClose={() => setDetailId(null)}
      />
    </>
  );
}
