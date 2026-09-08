"use client";
import { hasEventCoordinates } from "@halaa/shared/utils/eventLocation";
import React, { useMemo, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import styles from "./summary.module.css";
import {
  resolveTaqnyatPlaceholders,
  buildTaqnyatPreviewContext,
} from "@halaa/shared/utils";
import { formatDate as formatLocaleDate, formatTime } from "@halaa/shared/utils/locale";
import useAuthStore from "@/stores/authStore";
import SummaryCards from "./SummaryCards";
import EventDataDisplay from "./EventDataDisplay";
import ScheduleSection from "./ScheduleSection";
import { INVITATION_TYPE_OPTIONS, invitationAllowsReply } from '@/utils/invitationTypes';

const Summary = ({ owner } = {}) => {
  const { watch, setValue } = useFormContext();
  const { t, i18n } = useTranslation("createEvent");
  const signedInName = useAuthStore(
    (state) => state.user?.name || ""
  );
  const hostName = owner ? owner.name || "" : signedInName;

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
  const invitationType = watch("invitationType") || 'reply_and_qr';
  const guestReplies = watch("guestReplies") || {};
  const selectedTemplate = watch("selectedTemplate") || null;
  const launchSettings = watch("launchSettings") || {};
  const scheduleDate = watch("scheduleDate") || launchSettings.scheduledDate || "";
  const scheduleTime = watch("scheduleTime") || launchSettings.scheduledTime || "";

  const formatDate = (date) => date ? formatLocaleDate(date, i18n.language) : "";

  // Format event type
  const formatEventType = (type) => t(`event_types.${type}`, type);

  // Resolve the WhatsApp template placeholders so the summary shows the same
  // mapped message as the step 4 picker cards and the WhatsApp preview pane.
  const invitationText = useMemo(() => {
    const bodyText = selectedTemplate?.bodyText;
    if (!bodyText) return "";
    const locale = selectedTemplate?.language || "ar";
    const dateFormatted = eventDate ? formatLocaleDate(eventDate, locale) : "";
    const context = buildTaqnyatPreviewContext({
      guestName: i18n?.language === "en" ? "Dear Guest" : "ضيفنا الكريم",
      eventTitle: eventName,
      dateFormatted,
      eventDate,
      locale,
      eventTime,
      locationAddress: address?.address || "",
      hostName,
    });
    return resolveTaqnyatPlaceholders(
      bodyText,
      selectedTemplate?.varMapping,
      context
    );
  }, [
    selectedTemplate,
    eventName,
    eventDate,
    eventTime,
    address?.address,
    hostName,
    i18n?.language,
  ]);

  const eventData = {
    staffCount: staffList.length || 0,
    guests: guestList.length,
    date: formatDate(eventDate),
    eventType: formatEventType(eventType),
    eventName: eventName,
    invitationText: invitationText || "",
    guestCount: guestList.length,
    dateTime:
      eventDate && eventTime ? `${formatDate(eventDate)} - ${formatTime(eventTime, i18n.language)}` : "",
    location: address.address || "",
    mapLink:
      hasEventCoordinates(address)
        ? `https://maps.google.com/?q=${address.latitude},${address.longitude}`
        : "",
    scheduleDate: formatDate(scheduleDate),
    scheduleTime: scheduleTime,
  };

  const templateImage = watch("templateImage");
  const imageUrl = useMemo(() => templateImage instanceof Blob ? URL.createObjectURL(templateImage) : templateImage, [templateImage]);
  useEffect(() => () => { if (templateImage instanceof Blob && imageUrl) URL.revokeObjectURL(imageUrl); }, [templateImage, imageUrl]);
  return (
    <div className={styles.summary}>
      <div className={styles.content}>
        <SummaryCards eventData={eventData} />
        {imageUrl && <img src={imageUrl} alt={t("invitation_visual")} style={{ maxWidth: "100%", maxHeight: 440, objectFit: "contain" }} />}

        <EventDataDisplay eventData={eventData} />

        <section className={styles.reviewDetails} aria-label={t('review_delivery', 'Invitation and replies')}>
          <h3>{t('review_delivery', 'Invitation and replies')}</h3>
          <dl>
            <dt>{t('invitation_type', 'Invitation type')}</dt>
            <dd>{t(INVITATION_TYPE_OPTIONS.find(option => option.value === invitationType)?.labelKey || 'invitation_type')}</dd>
            {invitationAllowsReply(invitationType) && <>
              <dt>{t('attendance_auto_reply')}</dt><dd dir="auto">{guestReplies.onAttend}</dd>
              <dt>{t('absence_auto_reply')}</dt><dd dir="auto">{guestReplies.onAbsent}</dd>
            </>}
          </dl>
          {staffList.length > 0 && <details><summary>{t('review_staff_list', {count: staffList.length, defaultValue: 'Review gate supervisors ({{count}})'})}</summary>
            <ul>{staffList.map((staff,index)=><li key={staff.id || index}><span dir="auto">{staff.name}</span> <bdi>{staff.mobile || staff.phone}</bdi></li>)}</ul>
          </details>}
        </section>

        <ScheduleSection eventData={eventData} />

        <div className={styles.checkboxSection}>
          <div className={styles.checkboxRow}>
            <input type="checkbox" id="confirm-reviewed" checked={confirmChecked}
              className={`${styles.checkbox} ${
                confirmChecked ? styles.checkboxChecked : ""
              }`}
              onChange={(e) => setValue("confirmReviewed", e.target.checked, { shouldValidate: true })}
            />
            <label htmlFor="confirm-reviewed" className={styles.checkboxLabel}>
              {t("confirm_reviewed")}
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Summary;
