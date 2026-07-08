import React from "react";
import styles from "./header.module.css";

const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M5.33 1.33V3.33M10.67 1.33V3.33M2.33 6.06H13.67M14 5.67V11.33C14 13.33 13 14.67 10.67 14.67H5.33C3 14.67 2 13.33 2 11.33V5.67C2 3.67 3 2.33 5.33 2.33H10.67C13 2.33 14 3.67 14 5.67Z" stroke="#c28e5c" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M14.67 8C14.67 11.68 11.68 14.67 8 14.67C4.32 14.67 1.33 11.68 1.33 8C1.33 4.32 4.32 1.33 8 1.33C11.68 1.33 14.67 4.32 14.67 8Z" stroke="#c28e5c" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10.47 10.12L8.4 8.88C8.04 8.67 7.75 8.16 7.75 7.74V5.01" stroke="#c28e5c" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LocationIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M8 8.95C8.86 8.95 9.56 8.25 9.56 7.39C9.56 6.53 8.86 5.83 8 5.83C7.14 5.83 6.44 6.53 6.44 7.39C6.44 8.25 7.14 8.95 8 8.95Z" stroke="#c28e5c" strokeWidth="1.2" />
    <path d="M2.41 6.18C3.73 0.39 12.28 0.4 13.59 6.19C14.36 9.58 12.25 12.45 10.41 14.22C9.07 15.51 6.93 15.51 5.59 14.22C3.75 12.45 1.64 9.57 2.41 6.18Z" stroke="#c28e5c" strokeWidth="1.2" />
  </svg>
);

function formatDate(date) {
  if (!date) return null;
  try {
    return new Date(date).toLocaleDateString("ar-SA", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

export default function Header({ eventName, event }) {
  const formattedDate = formatDate(event?.date);
  const time = event?.time;
  const location = event?.location?.address || event?.location?.city || null;

  const meta = [
    formattedDate && { icon: <CalendarIcon />, text: formattedDate },
    time && { icon: <ClockIcon />, text: time },
    location && { icon: <LocationIcon />, text: location },
  ].filter(Boolean);

  return (
    <div className={styles.headerContainer}>
      <div className={styles.headerCard}>
        <h1 className={styles.eventTitle}>{eventName}</h1>
        {meta.length > 0 && (
          <div className={styles.metaRow}>
            {meta.map((item, index) => (
              <div key={index} className={styles.metaItem}>
                <span className={styles.metaIcon}>{item.icon}</span>
                <span className={styles.metaText}>{item.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
