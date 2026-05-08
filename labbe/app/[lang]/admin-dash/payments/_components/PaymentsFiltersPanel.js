"use client";
import { useTranslation } from "react-i18next";
import styles from "./AdminPaymentsClient.module.css";

const STATUS_VALUES = ["all", "completed", "pending", "failed", "refunded"];

export default function PaymentsFiltersPanel({ status, from, to, onChange }) {
  const { t } = useTranslation("adminPayments");
  return (
    <div className={styles.filtersPanel}>
      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>
          {t("table.filter", "Status")}
        </label>
        <select
          className={styles.filterSelect}
          value={status}
          onChange={(e) => onChange({ status: e.target.value })}
        >
          {STATUS_VALUES.map((v) => (
            <option key={v} value={v}>
              {t(`table.status.${v}`, v)}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>
          {t("dateRange.from", "From")}
        </label>
        <input
          type="date"
          className={styles.filterInput}
          value={from}
          onChange={(e) => onChange({ from: e.target.value })}
        />
      </div>
      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>
          {t("dateRange.to", "To")}
        </label>
        <input
          type="date"
          className={styles.filterInput}
          value={to}
          onChange={(e) => onChange({ to: e.target.value })}
        />
      </div>
    </div>
  );
}
