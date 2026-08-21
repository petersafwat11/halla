"use client";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import styles from "./summary.module.css";
import SummaryCards from "./SummaryCards";
import EventDataDisplay from "./EventDataDisplay";
import ScheduleSection from "./ScheduleSection";

const Summary = () => {
  const { watch, setValue } = useFormContext();
  const { t } = useTranslation("createEvent");

  // Watch confirmReviewed from form state
  const confirmChecked = watch("confirmReviewed") || false;

  // Watch all form data
  const eventType = watch("eventType") || "";
  const eventName = watch("eventName") || "";
  const eventDate = watch("eventDate") || "";
  const eventTime = watch("eventTime") || "";
  const address = watch("address") || {};
  const guestList = watch("guestList") || [];
  const staffList = watch("staffList") || [];
  const selectedTemplate = watch("selectedTemplate") || null;
  const launchSettings = watch("launchSettings") || {};
  const scheduleDate = watch("scheduleDate") || launchSettings.scheduledDate || "";
  const scheduleTime = watch("scheduleTime") || launchSettings.scheduledTime || "";

  // Format date helper
  const formatDate = (date) => {
    if (!date) return "";
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (Number.isNaN(dateObj.getTime())) return "";
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
  };

  // Format event type
  const formatEventType = (type) => {
    const typeMap = {
      wedding: t("wedding"),
      birthday: t("birthday"),
      graduation: t("graduation"),
      meeting: t("meeting"),
      conference: t("conference"),
      other: t("other"),
    };
    return typeMap[type] || type;
  };

  const eventData = {
    staffCount: staffList.length || 0,
    guests: guestList.length,
    date: formatDate(eventDate),
    eventType: formatEventType(eventType),
    eventName: eventName,
    invitationText: selectedTemplate?.bodyText || "",
    guestCount: guestList.length,
    dateTime:
      eventDate && eventTime ? `${formatDate(eventDate)} - ${eventTime}` : "",
    location: address.address || "",
    mapLink:
      address.latitude && address.longitude
        ? `https://maps.google.com/?q=${address.latitude},${address.longitude}`
        : "",
    scheduleDate: formatDate(scheduleDate),
    scheduleTime: scheduleTime,
  };

  return (
    <div className={styles.summary}>
      <div className={styles.content}>
        <SummaryCards eventData={eventData} />

        <EventDataDisplay eventData={eventData} />

        <ScheduleSection eventData={eventData} />

        <div className={styles.checkboxSection}>
          <div className={styles.checkboxRow}>
            <div
              className={`${styles.checkbox} ${
                confirmChecked ? styles.checkboxChecked : ""
              }`}
              onClick={() => setValue("confirmReviewed", !confirmChecked)}
            />
            <span className={styles.checkboxLabel}>
              {t("confirm_reviewed")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Summary;
