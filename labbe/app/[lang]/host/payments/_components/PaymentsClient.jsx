"use client";
import React, { useState } from "react";
import styles from "../page.module.css";
import PaymentsHeader from "./PaymentsHeader";
import Table from "@/ui/commen/new-table/Table";
import StatusBadge from "./StatusBadge";
import { MdDelete } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { useMyPayments } from "@/hooks/reactQueryHooks/useSubscriptions";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";

const PaymentsClient = () => {
  const { t } = useTranslation("hostPayments");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: paymentsData, isLoading } = useMyPayments(
    { page, limit, status: filter },
    { staleTime: 1 * 60 * 1000 }
  );

  const payments = paymentsData?.data?.payments || [];
  const pagination = paymentsData?.data?.pagination || { page: 1, pages: 1, total: 0 };

  const headers = [
    t("table.columns.service"),
    t("table.columns.amount"),
    t("table.columns.date"),
    t("table.columns.status"),
  ];

  const tableData = payments.map((item) => ({
    id: item.id,
    service: item.service,
    amount: `${item.amount} ${item.currency}`,
    date: new Date(item.createdAt).toLocaleString(),
    status: item.status,
    statusText: t(`table.status.${item.status}`, item.status),
  }));

  const filterOptions = [
    {
      text: t("table.filter.all"),
      onClick: () => {
        setFilter("all");
        setPage(1);
      },
    },
    {
      text: t("table.filter.success"),
      onClick: () => {
        setFilter("completed");
        setPage(1);
      },
    },
    {
      text: t("table.filter.pending"),
      onClick: () => {
        setFilter("pending");
        setPage(1);
      },
    },
    {
      text: t("table.filter.cancelled"),
      onClick: () => {
        setFilter("failed");
        setPage(1);
      },
    },
  ];

  const renderCell = (key, value, row) => {
    if (key === "status") {
      return <StatusBadge status={value} text={row.statusText} />;
    }
    return value;
  };

  const handleExport = () => {
    console.log("Export payments data", payments);
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <PaymentsHeader />
        <SimpleLoading message={t("loading")} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PaymentsHeader />
      <Table
        title={t("table.title")}
        headers={headers}
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
          onPageChange: setPage,
        }}
      />
    </div>
  );
};

export default PaymentsClient;
