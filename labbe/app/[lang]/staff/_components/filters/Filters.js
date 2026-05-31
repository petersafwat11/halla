"use client";
import React from "react";
import SearchableSelect from "@/ui/commen/inputs/SearchableSelect/SearchableSelect";
import styles from "./filters.module.css";

const STATUS_VALUES = ["invited", "confirmed", "checked_in", "declined", "maybe"];

export default function Filters({ search, status, onChange, t }) {
  const statusOptions = STATUS_VALUES.map((value) => ({
    value,
    label: t(`filters.${value === "checked_in" ? "checkedIn" : value}`),
  }));

  return (
    <div className={styles.filters}>
      <div className={styles.searchContainer}>
        <svg
          className={styles.searchIcon}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M7.25 12.5C10.1495 12.5 12.5 10.1495 12.5 7.25C12.5 4.35051 10.1495 2 7.25 2C4.35051 2 2 4.35051 2 7.25C2 10.1495 4.35051 12.5 7.25 12.5Z"
            stroke="#929FA5"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10.9624 10.9625L13.9999 14"
            stroke="#929FA5"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <input
          type="search"
          className={styles.searchInput}
          value={search}
          placeholder={t("filters.searchPlaceholder")}
          onChange={(e) => onChange({ search: e.target.value, status })}
          aria-label={t("filters.searchPlaceholder")}
        />
      </div>

      <SearchableSelect
        className={styles.statusSelect}
        options={statusOptions}
        value={status || ""}
        onChange={(value) => onChange({ search, status: value })}
        allOption={{ value: "", label: t("filters.allStatuses") }}
        placeholder={t("filters.allStatuses")}
        searchPlaceholder={t("filters.searchPlaceholder")}
        noOptionsMessage={t("filters.allStatuses")}
      />
    </div>
  );
}
