"use client";
import React, { useState } from "react";
import styles from "../page.module.css";
import PaymentsHeader from "./PaymentsHeader";
import Table from "@/ui/commen/new-table/Table";
import StatusBadge from "./StatusBadge";
import { MdDelete } from "react-icons/md";
import { useTranslation } from "react-i18next";

const paymentsData = [
  // {
  //   id: 1,
  //   service: "حفل زفاف احمد ومريم",
  //   amount: "2000 ريال",
  //   date: "2020-05-04 09:18:16",
  //   status: "success",
  //   statusText: "ناجحة",
  // },
  // {
  //   id: 2,
  //   service: "حفل زفاف احمد ومريم",
  //   amount: "2000 ريال",
  //   date: "2020-05-01 06:05:46",
  //   status: "cancelled",
  //   statusText: "ملغية",
  // },
  // {
  //   id: 3,
  //   service: "حفل زفاف احمد ومريم",
  //   amount: "2000 ريال",
  //   date: "2020-05-05 10:21:13",
  //   status: "pending",
  //   statusText: "معلقة",
  // },
  // {
  //   id: 5,
  //   service: "حفل زفاف احمد ومريم",
  //   amount: "2000 ريال",
  //   date: "2020-05-06 11:24:08",
  //   status: "cancelled",
  //   statusText: "ملغية",
  // },
  // {
  //   id: 6,
  //   service: "حفل زفاف احمد ومريم",
  //   amount: "2000 ريال",
  //   date: "2020-05-02 07:10:15",
  //   status: "cancelled",
  //   statusText: "ملغية",
  // },
  // {
  //   id: 7,
  //   service: "حفل زفاف احمد ومريم",
  //   amount: "2000 ريال",
  //   date: "2020-05-03 08:14:01",
  //   status: "cancelled",
  //   statusText: "ملغية",
  // },
];

const PaymentsClient = () => {
  const { t } = useTranslation("hostPayments");
  const [payments, setPayments] = useState(paymentsData);
  const [filter, setFilter] = useState("all");

  // Filter data based on selected filter
  const filteredData = payments.filter((item) => {
    if (filter === "all") return true;
    return item.status === filter;
  });

  const headers = [
    t("table.columns.service"),
    t("table.columns.amount"),
    t("table.columns.date"),
    t("table.columns.status"),
  ];

  const handleDelete = (row) => {
    if (confirm(`${t("table.actions.delete")} ${row.service}?`)) {
      setPayments((prev) => prev.filter((item) => item.id !== row.id));
      console.log("Deleted payment:", row.id);
    }
  };

  const handleDeleteAll = () => {
    if (confirm(t("table.actions.deleteAll") + "?")) {
      setPayments([]);
      console.log("Deleted all payments");
    }
  };

  const actions = [
    {
      icon: <MdDelete size={16} color="#C0392B" />,
      text: t("table.actions.delete"),
      onClick: handleDelete,
    },
  ];

  const filterOptions = [
    {
      text: t("table.filter.all"),
      onClick: () => setFilter("all"),
    },
    {
      text: t("table.filter.success"),
      onClick: () => setFilter("success"),
    },
    {
      text: t("table.filter.pending"),
      onClick: () => setFilter("pending"),
    },
    {
      text: t("table.filter.cancelled"),
      onClick: () => setFilter("cancelled"),
    },
  ];

  const moreOptions = [
    {
      text: t("table.actions.deleteAll"),
      icon: <MdDelete size={16} color="#C0392B" />,
      onClick: handleDeleteAll,
    },
  ];

  const renderCell = (key, value, row) => {
    if (key === "status") {
      return <StatusBadge status={value} text={row.statusText} />;
    }
    return value;
  };

  const handleExport = () => {
    console.log("Export payments data", filteredData);
  };

  return (
    <div className={styles.page}>
      <PaymentsHeader />
      <Table
        title={t("table.title")}
        headers={headers}
        data={filteredData}
        actions={actions}
        filterOptions={filterOptions}
        moreOptions={moreOptions}
        renderCell={renderCell}
        onExportClick={handleExport}
        showSearch={true}
        showFilter={true}
        showExport={true}
      />
    </div>
  );
};

export default PaymentsClient;
