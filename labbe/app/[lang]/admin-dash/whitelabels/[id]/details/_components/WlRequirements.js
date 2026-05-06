"use client";
import styles from "./WhitelabelDetailsWrapper.module.css";

export default function WlRequirements({ wlData, t }) {
  const req = wlData?.requirements;
  if (!req) return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>{t("sections.requirements", "System Requirements")}</h2>
      <div className={styles.cardContent}>
        <p className={styles.noData}>{t("messages.noRequirements", "No requirements specified")}</p>
      </div>
    </div>
  );

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>{t("sections.requirements", "System Requirements")}</h2>
      <div className={styles.cardContent}>
        <div className={styles.infoRow}>
          <span className={styles.label}>{t("fields.monthlyEvents", "Monthly Events")}</span>
          <span className={styles.value}>{req.numberOfEventsMonthly || "0"}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>{t("fields.monthlyGuests", "Monthly Guests")}</span>
          <span className={styles.value}>{req.numberOfGuestsMonthly || "0"}</span>
        </div>
        {req.eventTypes?.length > 0 && (
          <div className={styles.tagsSection}>
            <span className={styles.label}>{t("fields.eventTypes", "Event Types")}</span>
            <div className={styles.tagsList}>
              {req.eventTypes.map((type, idx) => <span key={idx} className={styles.tag}>{type}</span>)}
            </div>
          </div>
        )}
        {req.eventsTypesOther && (
          <div className={styles.infoRow}>
            <span className={styles.label}>{t("fields.otherTypes", "Other Types")}</span>
            <span className={styles.value}>{req.eventsTypesOther}</span>
          </div>
        )}
      </div>
    </div>
  );
}
