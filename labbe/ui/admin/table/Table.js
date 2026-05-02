"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import styles from "./table.module.css";
import DynamicTable from "@/ui/commen/table";
import Image from "next/image";

const Table = ({
  data,
  search,
  setSearch,
  translationKey,
  enhancedColumns,
  handleExport,
  dataKey = "admins", // Add dataKey prop with default value
  title, // Add title prop
}) => {
  const { t } = useTranslation(translationKey);

  // Get the appropriate data array based on dataKey
  const tableData = data?.[dataKey] || [];

  return (
    <div className={styles.container}>
      <div className={styles.tableHeadSection}>
        <div className={styles.tableHeadTitle}>{title || t("table.title")}</div>
        <div className={styles.tableHeadActions}>
          <div className={styles.inputContainer}>
            <Image
              width={24}
              height={24}
              src="/svg/admin/search.svg"
              alt="search"
            />

            <input
              type="text"
              placeholder={t("table.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch && setSearch(e.target.value)}
            />
          </div>
          {/* <div className={styles.filter}>
            <Image
              width={24}
              height={24}
              src="/svg/admin/filter.svg"
              alt="filter"
            />
            {t("table.filter")}
          </div> */}
          <div className={styles.export} onClick={handleExport}>
            <Image
              width={24}
              height={24}
              src="/svg/admin/export.svg"
              alt="export"
            />
            {t("table.export")}
          </div>
        </div>
      </div>
      <div
        style={{
          width: "100%",
          overflowX: "auto",
          padding: "0 24px 24px 24px",
        }}
      >
        <DynamicTable columns={enhancedColumns} data={tableData} />
      </div>
    </div>
  );
};

export default Table;
