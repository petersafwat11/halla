"use client";
import styles from "./WhitelabelDetailsWrapper.module.css";

export default function WlAddress({ wlData, t }) {
  const addr = wlData?.address;
  if (!addr) return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>{t("sections.address", "Address")}</h2>
      <div className={styles.cardContent}>
        <p className={styles.noData}>{t("messages.noAddress", "No address specified")}</p>
      </div>
    </div>
  );

  const fields = [
    { label: t("fields.city", "City"), value: addr.city },
    { label: t("fields.neighborhood", "Neighborhood"), value: addr.neighborhood },
    { label: t("fields.street", "Street"), value: addr.street },
    { label: t("fields.buildingNumber", "Building Number"), value: addr.buildingNumber },
    { label: t("fields.additionalNumber", "Additional Number"), value: addr.additionalNumber },
  ];

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>{t("sections.address", "Address")}</h2>
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
