"use client";
import React from "react";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import styles from "./invitationCard.module.css";

// NOTE: The two Builder.io image URLs below were migrated to local /public assets.
const FLORAL_TOP_URL = "/post-event/floral-top.png";
const FLORAL_BOTTOM_URL = "/post-event/floral-bottom.png";

// NOTE (Rule 3 / Rule 2): The locale keys below (quranVerse, groomName,
// brideName, saturday, day, month, year, timeText, villaNumber, address,
// attendanceText, waitingText, weddingCelebration) currently hold demo/
// placeholder values in the JSON files. They should be replaced with
// backend-driven props sourced from `eventInfo` / `content` in a follow-up
// task once the backend response shape is confirmed.
const InvitationCard = ({ eventInfo, content }) => {
  const { t } = useTranslation("postEvent");
  return (
    <div className={styles.cardWrapper}>
      <div className={styles.cardContainer}>
        <svg className={styles.backgroundPaper} width="342" height="479" viewBox="0 0 342 479" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M341.564 0H0V478.916H341.564V0Z" fill="white"/>
        </svg>
        
        <svg className={styles.borderFrame} width="315" height="452" viewBox="0 0 315 452" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path opacity="0.23" d="M314.098 451.451V0.417969L0.417328 0.417969V451.451H314.098Z" stroke="#9A8479" strokeWidth="0.836511" strokeMiterlimit="10"/>
        </svg>
        
        <Image
          src={FLORAL_TOP_URL}
          alt={t("floralDecoration", "Floral decoration")}
          width={342}
          height={479}
          className={styles.floralTopLeft}
        />

        <Image
          src={FLORAL_BOTTOM_URL}
          alt={t("floralDecoration", "Floral decoration")}
          width={342}
          height={479}
          className={styles.floralBottomRight}
        />
        
        <div className={styles.content}>
          <div className={styles.quranVerse}>
            {t("quranVerse")}
          </div>
          
          <div className={styles.coupleNames}>
            <span className={styles.brideName}>{t("brideName")}</span>
            <span className={styles.and}>{t("and")}</span>
            <span className={styles.groomName}>{t("groomName")}</span>
          </div>
          
          <div className={styles.waitingText}>
            <div>{t("waitingText")}</div>
            <div>{t("weddingCelebration")}</div>
          </div>
          
          <div className={styles.dateTimeSection}>
            <span className={styles.year}>{t("year")}</span>
            <div className={styles.divider}></div>
            <div className={styles.mainDate}>
              <div className={styles.dayName}>{t("saturday")}</div>
              <div className={styles.day}>{t("day")}</div>
            </div>
            <div className={styles.divider}></div>
            <span className={styles.month}>{t("month")}</span>
          </div>
          
          <div className={styles.timeText}>
            {t("timeText")}
          </div>
          
          <div className={styles.locationSection}>
            <div className={styles.villaNumber}>{t("villaNumber")}</div>
            <div className={styles.address}>{t("address")}</div>
          </div>
          
          <div className={styles.attendanceText}>
            {t("attendanceText")}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvitationCard;
