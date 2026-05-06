"use client";
import styles from "./WhitelabelDetailsWrapper.module.css";

export default function WlLicenseTax({ wlData, t }) {
  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>{t("sections.licenseTax", "License & Tax")}</h2>
      <div className={styles.cardContent}>
        <div className={styles.infoRow}>
          <span className={styles.label}>{t("fields.commercialRegistration", "Commercial Registration")}</span>
          <span className={styles.value}>{wlData?.licenseNumber || "-"}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>{t("fields.taxNumber", "Tax Number")}</span>
          <span className={styles.value}>{wlData?.taxNumber || "-"}</span>
        </div>
      </div>
    </div>
  );
}
