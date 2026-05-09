"use client";
import React from "react";
import styles from "./filters.module.css";

const STATUS_OPTIONS = [
  "all",
  "invited",
  "confirmed",
  "checked_in",
  "declined",
  "maybe",
];

export default function Filters({ search, status, onChange, t }) {
  return (
    <div className={styles.filters}>
      <input
        type="search"
        className={styles.searchInput}
        value={search}
        placeholder={t("filters.searchPlaceholder")}
        onChange={(e) => onChange({ search: e.target.value, status })}
        aria-label={t("filters.searchPlaceholder")}
      />
      <select
        className={styles.statusSelect}
        value={status || "all"}
        onChange={(e) =>
          onChange({
            search,
            status: e.target.value === "all" ? "" : e.target.value,
          })
        }
        aria-label={t("filters.allStatuses")}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {t(
              opt === "all"
                ? "filters.allStatuses"
                : `filters.${opt === "checked_in" ? "checkedIn" : opt}`
            )}
          </option>
        ))}
      </select>
    </div>
  );
}
