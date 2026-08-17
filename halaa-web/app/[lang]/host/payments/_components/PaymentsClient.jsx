"use client";
import React, { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import styles from "../page.module.css";
import PaymentsHeader from "./PaymentsHeader";
import Table from "@/ui/commen/new-table/Table";
import StatusBadge from "./StatusBadge";
import { useMyPayments } from "@/hooks/subscriptions";
import { useMyPaymentsExport } from "@/hooks/payments";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";

const PaymentsClient = () => {
  const { t } = useTranslation("hostPayments");
  const router = useRouter();
  const searchParams = useSearchParams();

  const filter = searchParams.get("status") || "all";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;

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

  const { data: paymentsData, isLoading, error } = useMyPayments(
    { page, limit, status: filter },
    { staleTime: 1 * 60 * 1000 }
  );
  const exportMutation = useMyPaymentsExport();

  const payments = paymentsData?.data?.payments || [];
  const pagination = paymentsData?.data?.pagination || {
    page: 1,
    pages: 1,
    total: 0,
  };

  const headers = [
    t("table.columns.service"),
    t("table.columns.amount"),
    t("table.columns.method", "Method"),
    t("table.columns.transactionId", "Transaction"),
    t("table.columns.date"),
    t("table.columns.status"),
  ];

  const headerKeys = [
    "service",
    "amount",
    "method",
    "transactionId",
    "date",
    "status",
  ];

  const tableData = payments.map((item) => ({
    id: item.id,
    service: item.service,
    amount:
      item.refundedAmount && item.refundedAmount > 0
        ? `${item.amount} ${item.currency} (- ${item.refundedAmount})`
        : `${item.amount} ${item.currency}`,
    method: item.paymentMethod
      ? `${t(`table.method.${item.paymentMethod}`, item.paymentMethod)}${
          item.paymentMethodLast4 ? ` •••• ${item.paymentMethodLast4}` : ""
        }`
      : "—",
    transactionId: item.transactionId || "—",
    date: new Date(item.createdAt).toLocaleString(),
    status: item.status,
    statusText: t(`table.status.${item.status}`, item.status),
  }));

  const filterOptions = [
    {
      text: t("table.filter.all"),
      onClick: () => updateParams({ status: "all" }),
    },
    {
      text: t("table.filter.success"),
      onClick: () => updateParams({ status: "completed" }),
    },
    {
      text: t("table.filter.pending"),
      onClick: () => updateParams({ status: "pending" }),
    },
    {
      text: t("table.filter.cancelled"),
      onClick: () => updateParams({ status: "failed" }),
    },
  ];

  const renderCell = (key, value, row) => {
    if (key === "status") {
      return <StatusBadge status={value} text={row.statusText} />;
    }
    return value;
  };

  const handleExport = async () => {
    try {
      await exportMutation.mutateAsync({
        ...(filter !== "all" && { status: filter }),
      });
      toastUtils.success(t("export.success", "Payments exported"));
    } catch (err) {
      handleError(err, t);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <PaymentsHeader />
        <SimpleLoading message={t("loading")} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <PaymentsHeader />
        <div className={styles.error}>
          {error.message ||
            t("errors.loadFailed", "Failed to load your payments")}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PaymentsHeader />
      <Table
        title={t("table.title")}
        headers={headers}
        headerKeys={headerKeys}
        data={tableData}
        filterOptions={filterOptions}
        renderCell={renderCell}
        onExportClick={handleExport}
        showSearch={true}
        showFilter={true}
        showExport={true}
        pagination={{
          currentPage: pagination.page,
          totalPages: pagination.pages,
          totalItems: pagination.total,
          onPageChange: (newPage) => updateParams({ page: String(newPage) }),
        }}
      />
    </div>
  );
};

export default PaymentsClient;
