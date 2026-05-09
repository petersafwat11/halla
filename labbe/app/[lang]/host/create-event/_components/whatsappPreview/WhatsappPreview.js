"use client";
import React, { useMemo } from "react";
import styles from "./whatsappPreview.module.css";
import Image from "next/image";
import { useTranslation } from "react-i18next";

const WhatsappPreview = ({
  eventTitle = "",
  previewBody = "",
  templateImage = "/svg/events/invitation.svg",
  templateData = {},
  locale = "ar",
  forceShow = false,
}) => {
  const { t } = useTranslation("createEvent");
  const { entryDate, address } = templateData;

  const formattedDate = useMemo(() => {
    if (!entryDate) return "";
    try {
      return new Date(entryDate).toLocaleDateString(
        locale === "ar" ? "ar-EG" : "en-US",
        { year: "numeric", month: "long", day: "numeric", calendar: "gregory" }
      );
    } catch {
      return "";
    }
  }, [entryDate, locale]);

  const resolvedMessage = useMemo(() => {
    if (!previewBody) return "";
    return previewBody
      .replace(/\{\{1\}\}/g, "ضيف عزيز")
      .replace(/\{\{2\}\}/g, eventTitle || "اسم المناسبة")
      .replace(/\{\{3\}\}/g, formattedDate || (entryDate ? entryDate : "التاريخ"))
      .replace(/\{\{4\}\}/g, address || "الموقع");
  }, [previewBody, eventTitle, formattedDate, entryDate, address]);

  const displayImage = useMemo(() => {
    if (!templateImage || templateImage === "/svg/events/invitation.svg") {
      return "/svg/events/invitation.svg";
    }
    try {
      if (typeof templateImage === "object" && templateImage instanceof File) {
        return URL.createObjectURL(templateImage);
      }
      if (typeof templateImage === "string" && templateImage.startsWith("uploads/")) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v2";
        const baseUrl = apiUrl.replace("/api/v2", "").replace("/api", "");
        return `${baseUrl}/${templateImage}`;
      }
      if (
        typeof templateImage === "string" &&
        (templateImage.startsWith("http") || templateImage.startsWith("/"))
      ) {
        return templateImage;
      }
      return "/svg/events/invitation.svg";
    } catch {
      return "/svg/events/invitation.svg";
    }
  }, [templateImage]);

  return (
    <div className={`${styles.previewContainer} ${forceShow ? styles.forceShow : ""}`}>
      {/* Card wrapper */}
      <div className={styles.previewCard}>
        <div className={styles.previewHeader}>
          <h3 className={styles.previewTitle}>معاينة الدعوة</h3>
        </div>

        {/* Phone frame */}
        <div className={styles.phoneWrap}>
          <div className={styles.phone}>
            {/* Notch */}
            <div className={styles.notch} />

            {/* WhatsApp top bar */}
            <div className={styles.waBar}>
              <div className={styles.waBarLeft}>
                <svg width="9" height="15" viewBox="0 0 9 15" fill="none">
                  <path d="M7.5 1.5L1.5 7.5L7.5 13.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className={styles.waAvatar}>H</div>
              <div className={styles.waInfo}>
                <span className={styles.waName}>Halaa Events</span>
                <span className={styles.waStatus}>online</span>
              </div>
              <div className={styles.waActions}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="5" r="1.5" fill="white"/>
                  <circle cx="12" cy="12" r="1.5" fill="white"/>
                  <circle cx="12" cy="19" r="1.5" fill="white"/>
                </svg>
              </div>
            </div>

            {/* Chat area */}
            <div className={styles.chatArea}>
              {/* Received message card */}
              <div className={styles.msgCard}>
                {/* Header image */}
                <div className={styles.msgImageWrap}>
                  <Image
                    src={displayImage}
                    alt="invitation"
                    fill
                    sizes="(max-width: 900px) 90vw, 320px"
                    className={styles.msgImage}
                    unoptimized={
                      displayImage.startsWith("blob:") ||
                      displayImage.includes("localhost")
                    }
                  />
                </div>

                {/* Body text */}
                {resolvedMessage ? (
                  <p className={styles.msgBody}>{resolvedMessage}</p>
                ) : (
                  <p className={styles.msgPlaceholder}>اختر قالب رسالة في الخطوة السابقة لمعاينة النص هنا</p>
                )}

                {/* Timestamp */}
                <div className={styles.msgMeta}>
                  <span className={styles.msgTime}>9:41</span>
                  <svg width="15" height="10" viewBox="0 0 15 10" fill="none">
                    <path d="M1 5L3.5 7.5L8 2" stroke="#53BDEB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6 5L8.5 7.5L13 2" stroke="#53BDEB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className={styles.ctaGroup}>
                <button className={styles.ctaBtn} type="button">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17L4 12" stroke="#0096DE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>سأحضر</span>
                </button>
                <div className={styles.ctaDivider} />
                <button className={styles.ctaBtn} type="button">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6L18 18" stroke="#0096DE" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span>سأعتذر</span>
                </button>
                <div className={styles.ctaDivider} />
                <button className={styles.ctaBtn} type="button">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="#0096DE" strokeWidth="2"/>
                    <path d="M12 8v4M12 16h.01" stroke="#0096DE" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span>ربما</span>
                </button>
              </div>
            </div>

            {/* Bottom input bar */}
            <div className={styles.inputBar}>
              <div className={styles.inputField}>
                <span className={styles.inputPlaceholder}>رسالة</span>
              </div>
              <div className={styles.micBtn}>
                <svg width="12" height="16" viewBox="0 0 24 28" fill="none">
                  <rect x="8" y="1" width="8" height="16" rx="4" fill="#54656F"/>
                  <path d="M4 14a8 8 0 0016 0" stroke="#54656F" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="12" y1="22" x2="12" y2="27" stroke="#54656F" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsappPreview;
