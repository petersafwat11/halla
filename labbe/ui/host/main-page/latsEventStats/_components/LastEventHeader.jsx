"use client";
import React from "react";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import styles from "../LastEventStats.module.css";

const STATUS_KEYS = {
  draft: { textKey: "lastEvent.status.draft", classKey: "statusNotSubmitted" },
  scheduled: { textKey: "lastEvent.status.scheduled", classKey: "statusPending" },
  live: { textKey: "lastEvent.status.active", classKey: "statusActive" },
  completed: { textKey: "lastEvent.status.completed", classKey: "statusPublished" },
  suspended: { textKey: "lastEvent.status.suspended", classKey: "statusSuspended" },
};

function formatDateTime(date, time, currentLocale) {
  if (!date) return "";
  try {
    const eventDate = new Date(date);
    const locale = currentLocale === "ar" ? "ar-EG" : "en-US";
    const dateStr = eventDate.toLocaleDateString(locale, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return time ? `${dateStr} - ${time}` : dateStr;
  } catch {
    return "";
  }
}

export default function LastEventHeader({ event, isMobile, currentLocale }) {
  const { t } = useTranslation("home-events");
  const statusInfo = STATUS_KEYS[event.status] || {
    textKey: "lastEvent.status.published",
    classKey: "statusPublished",
  };
  const formattedDateTime = formatDateTime(event.date, event.time, currentLocale);
  const location = event.locationName || "";

  return (
    <div className={styles.container}>
      <div className={styles.eventImage}>
        <div className={styles.imagePlaceholder}>
          <svg
            width={isMobile ? "40" : "80"}
            height={isMobile ? "40" : "80"}
            viewBox={isMobile ? "0 0 40 40" : "0 0 80 80"}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              width={isMobile ? "40" : "80"}
              height={isMobile ? "40" : "80"}
              fill="#F2F2F2"
            />
          </svg>
        </div>
      </div>

      <div className={styles.eventInfo}>
        <div className={styles.headerContainer}>
          <div className={styles.titleContainer}>
            <h3 className={styles.eventTitle}>{event.title}</h3>
          </div>
          <div className={`${styles.statusBadge} ${styles[statusInfo.classKey]}`}>
            <span className={styles.statusText}>{t(statusInfo.textKey)}</span>
          </div>
        </div>

        {!isMobile && (
          <div className={styles.metaInfo}>
            <div className={styles.metaItem}>
              <Image src="/svg/events/people.svg" alt="guest" width={16} height={16} />
              <div className={styles.metaText}>
                {event.guestCount} {t("lastEvent.buttons.guests")}
              </div>
            </div>
            <div className={styles.metaItem}>
              <Image src="/svg/events/calendar.svg" alt="date" width={16} height={16} />
              <div className={styles.metaText}>{formattedDateTime}</div>
            </div>
            <div className={styles.metaItem}>
              <Image src="/svg/events/location.svg" alt="location" width={16} height={16} />
              <div className={styles.metaText}>{location}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
