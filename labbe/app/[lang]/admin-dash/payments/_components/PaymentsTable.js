"use client";

import { useMemo, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { usePageAccess } from "@/hooks/usePageAccess";
import {
  useAdminPayments,
  useAdminPaymentsExport,
} from "@/hooks/reactQueryHooks/useAdmin";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";
import Table from "@/ui/commen/new-table/Table";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import PaymentActionModal from "./PaymentActionModal";
import PaymentDetailModal from "./PaymentDetailModal";
import usePaymentActions from "./usePaymentActions";
import styles from "./PaymentsTable.module.css";

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

export default function PaymentsTable() {
  const { t, i18n } = useTranslation("adminPayments");
  const isArabic = i18n.language === "ar";
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canUpdate, canDelete } = usePageAccess("payments");

  const [detailId, setDetailId] = useState(null);
  const actions = usePaymentActions();
  const exportMutation = useAdminPaymentsExport();

  const filters = useMemo(
    () => ({
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
      search: searchParams.get("search") || undefined,
      status: searchParams.get("status") || undefined,
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
    }),
    [searchParams]
  );

  const { data, isLoading, error } = useAdminPayments(filters);
  const payments = data?.data?.payments || [];
  const pagination = data?.data?.pagination || { page: 1, pages: 1, total: 0 };

  const handlePageChange = useCallback(
    (page) => {
      const params = new URLSearchParams(searchParams);
      params.set("page", page);
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
      const params = new URLSearchParams(searchParams);
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

        if (refundable) {
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
    [canUpdate, t, actions]
  );

  const renderCell = useCallback(
    (key, value, row) => {
      if (key === "status") {
        const badgeStyle = STATUS_COLOR[value] || {
          background: "#f5f5f5",
          color: "#666",
        };
        return (
          <span
            style={{
              display: "inline-flex",
              padding: "0.2rem 1rem",
              borderRadius: "999px",
              fontSize: "1.2rem",
              fontWeight: 500,
              background: badgeStyle.background,
              color: badgeStyle.color,
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
          renderCell={renderCell}
          getRowActions={getRowActions}
          showCheckboxes={canUpdate || canDelete}
          showExport={true}
          onExportClick={handleExport}
          filterOptions={[
            {
              text: t("table.status.all", "All"),
              onClick: () => handleStatusFilter(""),
            },
            {
              text: t("table.status.completed", "Completed"),
              onClick: () => handleStatusFilter("completed"),
            },
            {
              text: t("table.status.pending", "Pending"),
              onClick: () => handleStatusFilter("pending"),
            },
            {
              text: t("table.status.failed", "Failed"),
              onClick: () => handleStatusFilter("failed"),
            },
            {
              text: t("table.status.refunded", "Refunded"),
              onClick: () => handleStatusFilter("refunded"),
            },
          ]}
          pagination={{
            currentPage: parseInt(filters.page),
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
