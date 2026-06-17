"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FiClock } from "react-icons/fi";
import styles from "./AutoReminderInfoText.module.css";
import { useEvent } from "@/hooks/events";
import useLocalizedDate from "@/utils/date/useLocalizedDate";
import CustomizeReminderPopup from "@/ui/host/popups/customizeReminderPopup/CustomizeReminderPopup";
import PopupWrapper from "@/ui/host/popups/popupWrapper/PopupWrapper";

/**
 * Small inline banner shown on the single-event page reminding the host
 * (or platform admin viewing the host's event) that the platform auto-
 * sends a reminder. Allows customization of when the reminder is sent.
 */
export default function AutoReminderInfoText({ eventId }) {
  const { t, i18n } = useTranslation("home-events");
  const { data } = useEvent(eventId);
  const { formatDate } = useLocalizedDate();
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const event = data?.data?.event;

  if (!event) return null;

  // If the event is completed or cancelled, don't show the customize button
  const isEditable = !["completed", "cancelled"].includes(event.status);

  const formatTimeStr = (timeStr) => {
    if (!timeStr) return "";
    const [hStr, mStr] = timeStr.split(":");
    const hour = parseInt(hStr, 10);
    const min = parseInt(mStr, 10);
    const lang = i18n.language || "ar";
    const ampm = hour >= 12 ? (lang === "ar" ? "م" : "PM") : (lang === "ar" ? "ص" : "AM");
    const hour12 = hour % 12 || 12;
    const minStr = String(min).padStart(2, "0");
    return `${hour12}:${minStr} ${ampm}`;
  };

  const hasCustom = !!event.reminderSettings?.customReminderTime;
  const customDate = event.reminderSettings?.scheduledDate;
  const customTime = event.reminderSettings?.scheduledTime;

  let infoText = t(
    "singleEvent.autoReminderInfo",
    "We automatically send a reminder to your guests 48 hours before the event."
  );

  if (hasCustom && customDate && customTime) {
    const formattedDate = formatDate(customDate);
    const formattedTime = formatTimeStr(customTime);
    infoText = t(
      "singleEvent.autoReminderInfoCustom",
      {
        defaultValue: "We automatically send a reminder to your guests on {{date}} at {{time}}.",
        date: formattedDate,
        time: formattedTime,
      }
    );
  }

  return (
    <>
      <div className={styles.banner} role="note">
        <span className={styles.iconWrap} aria-hidden="true">
          <FiClock className={styles.icon} />
        </span>
        <span className={styles.text}>{infoText}</span>
        {isEditable && (
          <button
            className={styles.customizeButton}
            onClick={() => setIsPopupOpen(true)}
            type="button"
          >
            {t("singleEvent.customizeReminder", "Customize")}
          </button>
        )}
      </div>

      <PopupWrapper isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)}>
        <CustomizeReminderPopup
          eventId={eventId}
          existingSettings={event.reminderSettings}
          onClose={() => setIsPopupOpen(false)}
        />
      </PopupWrapper>
    </>
  );
}
