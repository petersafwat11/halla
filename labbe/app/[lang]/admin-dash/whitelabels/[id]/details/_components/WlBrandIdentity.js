"use client";
import styles from "./WhitelabelDetailsWrapper.module.css";

export default function WlBrandIdentity({ wlData, t }) {
  const fields = [
    { label: t("fields.arabicName", "Arabic Name"), value: wlData?.arabicName },
    { label: t("fields.englishName", "English Name"), value: wlData?.englishName },
    { label: t("fields.companyName", "Company Name"), value: wlData?.companyName },
    { label: t("fields.platformName", "Platform Name"), value: wlData?.platformName },
  ];

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>{t("sections.brandIdentity", "Brand Identity")}</h2>
      <div className={styles.cardContent}>
        {fields.map((f, i) => (
          <div key={i} className={styles.infoRow}>
            <span className={styles.label}>{f.label}</span>
            <span className={styles.value}>{f.value || "-"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
