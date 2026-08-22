"use client";
import React, { useState, useRef, useEffect } from "react";
import styles from "./EventCard.module.css";
import { useTranslation } from "react-i18next";
import Button from "@/ui/commen/button/Button";
import { useMediaQuery } from "@/hooks/use-media-query";
import PopupWrapper from "@/ui/host/popups/popupWrapper/PopupWrapper";
import TestPopup from "@/ui/host/popups/testPopup/TestPopup";
import ScheduleSendingPopup from "@/ui/host/popups/scheduleSendingPopup/ScheduleSendingPopup";
import { useRouter } from "next/navigation";
import UseLanguageChange from "@/hooks/UseLanguageChange";
import { buildUpdateEventUrl } from "@halaa/shared/utils";

function EventCard({ event }) {
  const isMobile = useMediaQuery("(max-width: 1024px)");
  const { t } = useTranslation("home-events");
  const router = useRouter();
  const { currentLocale } = UseLanguageChange();
  const [isTestPopupOpen, setIsTestPopupOpen] = useState(false);
  const [isSchedulePopupOpen, setIsSchedulePopupOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Early return if no event data
  if (!event) {
    return null;
  }

  const handleTestSending = () => {
    setIsTestPopupOpen(true);
  };

  const handleScheduleSending = () => {
    setIsSchedulePopupOpen(true);
  };

  const handleCloseTestPopup = () => {
    setIsTestPopupOpen(false);
  };

  const handleCloseSchedulePopup = () => {
    setIsSchedulePopupOpen(false);
  };

  const handleViewStats = () => {
    if (event._id) {
      router.push(`/${currentLocale}/host/events/${event._id}`);
    }
  };

  const handleManageClick = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleUpdateNavigation = (stepOrSection) => {
    const eventId = event._id || event.id;
    if (eventId) {
      router.push(
        buildUpdateEventUrl({
          locale: currentLocale,
          basePath: "host",
          eventId,
          section: typeof stepOrSection === "string" ? stepOrSection : undefined,
          step: typeof stepOrSection === "number" ? stepOrSection : 1,
        })
      );
    }
    setIsDropdownOpen(false);
  };

  return (
    <>
      <div className={styles.card}>
        <div className={styles.content}>
          <img
            style={{
              backgroundColor: "#F9F6F2",
              width: isMobile ? 40 : 80,
              height: isMobile ? 40 : 80,
              borderRadius: "12px",
            }}
            src="/svg/auth/calendar.svg"
            alt=""
          />
          <div className={styles.header}>
            <div className={styles.headerContent}>
              <span className={styles.title}>{event.title}</span>
              <span className={styles.status}>
                {t("eventCard.status.upcoming")}
              </span>
            </div>

            <div className={styles.details}>
              <div className={styles.detailSection}>
                <img src="/svg/events/people.svg" alt="" />
                <span>{event.guest}</span>
              </div>
              <div className={styles.detailSection}>
                <img src="/svg/events/calendar.svg" alt="" />
                <span>{event.date}</span>
              </div>
              <div className={styles.detailSection}>
                <img src="/svg/events/location.svg" alt="" />
                <span>{event.location}</span>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.statsContainer}>
          <div className={styles.stats}>
            <div className={styles.replying}>
              <span>{t("eventCard.stats.replyStatus")}</span>
              <span>
                {event.replyingRate} {t("eventCard.stats.responseRate")}
              </span>
            </div>
            <div className={styles.replyingAnalysis}>
              <div className={styles.replyingAnalysisSection}>
                <span
                  className={styles.replyingAnalysisSectionColor}
                  style={{ backgroundColor: "#2A8C5B" }}
                ></span>
                <span className={styles.replyingAnalysisSectionText}>
                  {t("eventCard.stats.confirmed")}:
                </span>
                <span className={styles.replyingAnalysisSectionValue}>
                  {event.confirmed}
                </span>
              </div>
              <div className={styles.replyingAnalysisSection}>
                <span
                  className={styles.replyingAnalysisSectionColor}
                  style={{ backgroundColor: "#C0392B" }}
                ></span>
                <span className={styles.replyingAnalysisSectionText}>
                  {t("eventCard.stats.apologies")}:
                </span>
                <span className={styles.replyingAnalysisSectionValue}>
                  {event.apologies}
                </span>
              </div>
              <div className={styles.replyingAnalysisSection}>
                <span
                  className={styles.replyingAnalysisSectionColor}
                  style={{ backgroundColor: "#A0A0A0" }}
                ></span>
                <span className={styles.replyingAnalysisSectionText}>
                  {t("eventCard.stats.noReply")}:
                </span>
                <span className={styles.replyingAnalysisSectionValue}>
                  {event.invited}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <div className={styles.dropdownContainer} ref={dropdownRef}>
            <Button
              className={styles.actionPrimaryButton}
              variant="primary"
              style={{ padding: "1rem", fontSize: "1rem" }}
              icon="/svg/events/setting-2.svg"
              title={t("eventCard.actions.manage")}
              onClick={handleManageClick}
            />
            {isDropdownOpen && (
              <div className={styles.dropdown}>
                <button
                  className={styles.dropdownItem}
                  onClick={() => handleUpdateNavigation("event-details")}
                >
                  تفاصيل المناسبة
                </button>
                <button
                  className={styles.dropdownItem}
                  onClick={() => handleUpdateNavigation("guest-list")}
                >
                  قائمة الضيوف
                </button>
                <button
                  className={styles.dropdownItem}
                  onClick={() => handleUpdateNavigation("invitation-settings")}
                >
                  تخصيص الرسالة
                </button>
              </div>
            )}
          </div>
          <Button
            className={styles.actionButton}
            variant="secondary"
            style={{ padding: "1rem", fontSize: "1rem" }}
            icon="/svg/events/diagram.svg"
            title={t("eventCard.actions.viewStats")}
            onClick={handleViewStats}
          />
          <Button
            className={styles.actionButton}
            variant="secondary"
            style={{ padding: "1rem", fontSize: "1rem" }}
            // icon="/svg/events/send-2.svg"
            title={t("eventCard.actions.testSend")}
            onClick={handleTestSending}
          />
          <Button
            className={styles.actionButton}
            variant="secondary"
            style={{ padding: "1rem", fontSize: "1rem" }}
            // icon="/svg/events/calendar-tick.svg"
            title={t("eventCard.actions.scheduleSend")}
            onClick={handleScheduleSending}
          />
        </div>
      </div>

      {/* Test Popup */}
      <PopupWrapper isOpen={isTestPopupOpen} onClose={handleCloseTestPopup}>
        <TestPopup onClose={handleCloseTestPopup} />
      </PopupWrapper>

      {/* Schedule Popup */}
      <PopupWrapper
        isOpen={isSchedulePopupOpen}
        onClose={handleCloseSchedulePopup}
      >
        <ScheduleSendingPopup
          onClose={handleCloseSchedulePopup}
          eventId={event?._id}
          existingSchedule={event?.launchSettings}
          eventDate={event?.eventDetails?.date}
        />
      </PopupWrapper>
    </>
  );
}

export default EventCard;
