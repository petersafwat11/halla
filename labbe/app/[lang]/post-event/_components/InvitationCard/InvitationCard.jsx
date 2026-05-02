"use client";
import React from "react";
import Image from "next/image";
import styles from "./invitationCard.module.css";

const InvitationCard = ({ t }) => {
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
          src="https://api.builder.io/api/v1/image/assets/TEMP/605c64577186a2adff305356c0a690f201de5208?width=684" 
          alt="Floral decoration" 
          width={342} 
          height={479}
          className={styles.floralTopLeft}
        />
        
        <Image 
          src="https://api.builder.io/api/v1/image/assets/TEMP/0f31a04adc079878a9ff922c0b342135d4e6783c?width=683" 
          alt="Floral decoration" 
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
