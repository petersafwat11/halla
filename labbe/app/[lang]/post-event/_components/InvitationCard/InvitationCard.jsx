"use client";
import React from "react";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import styles from "./invitationCard.module.css";

// Floral fallback assets for when the parent Event has no `visualTemplate`.
const FLORAL_TOP_URL = "/post-event/floral-top.png";
const FLORAL_BOTTOM_URL = "/post-event/floral-bottom.png";

const formatDateParts = (rawDate) => {
  if (!rawDate) return { dayName: "", day: "", month: "", year: "" };
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) {
    return { dayName: "", day: "", month: "", year: "" };
  }
  return {
    dayName: date.toLocaleDateString("ar", { weekday: "long" }),
    day: String(date.getDate()),
    month: date.toLocaleDateString("ar", { month: "long" }),
    year: String(date.getFullYear()),
  };
};

const InvitationCard = ({ event }) => {
  const { t } = useTranslation("postEvent");

  const hostName = event?.host?.name || "";
  const eventTitle = event?.eventDetails?.title || "";
  const dateParts = formatDateParts(event?.eventDetails?.date);
  const timeText = event?.eventDetails?.time || "";
  const address = event?.eventDetails?.location?.address || "";
  const bakedImage = event?.visualTemplate?.bakedImagePath;

  return (
    <div className={styles.cardWrapper}>
      <div className={styles.cardContainer}>
        <svg
          className={styles.backgroundPaper}
          width="342"
          height="479"
          viewBox="0 0 342 479"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M341.564 0H0V478.916H341.564V0Z" fill="white" />
        </svg>

        <svg
          className={styles.borderFrame}
          width="315"
          height="452"
          viewBox="0 0 315 452"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            opacity="0.23"
            d="M314.098 451.451V0.417969L0.417328 0.417969V451.451H314.098Z"
            stroke="#9A8479"
            strokeWidth="0.836511"
            strokeMiterlimit="10"
          />
        </svg>

        {bakedImage ? (
          <Image
            src={bakedImage}
            alt={t("invitationImageAlt")}
            width={342}
            height={479}
            className={styles.bakedImage}
            unoptimized
          />
        ) : (
          <>
            <Image
              src={FLORAL_TOP_URL}
              alt={t("floralDecoration")}
              width={342}
              height={479}
              className={styles.floralTopLeft}
            />
            <Image
              src={FLORAL_BOTTOM_URL}
              alt={t("floralDecoration")}
              width={342}
              height={479}
              className={styles.floralBottomRight}
            />
          </>
        )}

        <div className={styles.content}>
          {hostName && (
            <div className={styles.hostName}>{hostName}</div>
          )}

          {eventTitle && (
            <div className={styles.eventTitle}>{eventTitle}</div>
          )}

          {(dateParts.dayName || dateParts.day || dateParts.month) && (
            <div className={styles.dateTimeSection}>
              <span className={styles.year}>{dateParts.year}</span>
              <div className={styles.divider}></div>
              <div className={styles.mainDate}>
                <div className={styles.dayName}>{dateParts.dayName}</div>
                <div className={styles.day}>{dateParts.day}</div>
              </div>
              <div className={styles.divider}></div>
              <span className={styles.month}>{dateParts.month}</span>
            </div>
          )}

          {timeText && <div className={styles.timeText}>{timeText}</div>}

          {address && (
            <div className={styles.locationSection}>
              <div className={styles.address}>{address}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvitationCard;
