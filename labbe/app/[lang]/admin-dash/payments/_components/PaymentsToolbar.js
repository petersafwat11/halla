"use client";
import { FaDownload, FaFilter } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import styles from "./AdminPaymentsClient.module.css";

export default function PaymentsToolbar({
  showFilters,
  onToggleFilters,
  onExport,
  exporting,
}) {
  const { t } = useTranslation("adminPayments");
  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarLeft}>
        <button
          type="button"
          onClick={onToggleFilters}
          className={`${styles.filterBtn} ${
            showFilters ? styles.filterBtnActive : ""
          }`}
        >
          <FaFilter /> {t("table.filter", "Filters")}
        </button>
      </div>
      <button
        type="button"
        onClick={onExport}
        disabled={exporting}
        className={styles.exportBtn}
      >
        <FaDownload />{" "}
        {exporting
          ? t("table.exporting", "Exporting…")
          : t("table.export", "Export")}
      </button>
    </div>
  );
}
