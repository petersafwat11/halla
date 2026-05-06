"use client";
import styles from "./WhitelabelDetailsWrapper.module.css";

const formatDate = (date) => {
  if (!date) return "-";
  try { return new Date(date).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" }); } catch { return "-"; }
};

export default function WlContactInfo({ wl, t }) {
  const fields = [
    { label: t("fields.email", "Email"), value: wl?.email },
    { label: t("fields.phoneNumber", "Phone Number"), value: wl?.phoneNumber, dir: "ltr" },
    { label: t("fields.username", "Username"), value: wl?.username },
    { label: t("fields.registeredAt", "Registration Date"), value: formatDate(wl?.createdAt) },
  ];

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>{t("sections.contactInfo", "Contact Information")}</h2>
      <div className={styles.cardContent}>
        {fields.map((f, i) => (
          <div key={i} className={styles.infoRow}>
            <span className={styles.label}>{f.label}</span>
            <span className={styles.value} dir={f.dir}>{f.value || "-"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
