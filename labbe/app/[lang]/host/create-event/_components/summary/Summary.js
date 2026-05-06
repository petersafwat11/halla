"use client";
import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import styles from "./summary.module.css";

const Summary = () => {
  const { watch, setValue } = useFormContext();
  const { t } = useTranslation("createEvent");
  const [isScheduled, setIsScheduled] = useState(false);

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
  const scheduleDate = watch("scheduleDate") || "";
  const scheduleTime = watch("scheduleTime") || "";

  // Format date helper
  const formatDate = (date) => {
    if (!date) return "";
    const dateObj = typeof date === "string" ? new Date(date) : date;
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

  const handleCancelSchedule = () => {
    setIsScheduled(false);
  };

  const handleReschedule = () => {
    // Handle reschedule logic
  };

  const handleCopyLink = () => {
    // Handle copy link logic
  };

  const handleShareLink = () => {
    // Handle share link logic
  };

  return (
    <div className={styles.summary}>
      <div className={styles.content}>
        <div className={styles.statsCards}>
          <div className={styles.statCard}>
            <div className={styles.iconContainer}>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5.53841 5.53726C6.81291 5.53726 7.8461 4.50407 7.8461 3.22957C7.8461 1.95506 6.81291 0.921875 5.53841 0.921875C4.2639 0.921875 3.23071 1.95506 3.23071 3.22957C3.23071 4.50407 4.2639 5.53726 5.53841 5.53726Z"
                  stroke="#C28E5C"
                  strokeWidth="0.692308"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M1.57397 10.1526C1.57397 8.36649 3.35091 6.92188 5.5386 6.92188"
                  stroke="#C28E5C"
                  strokeWidth="0.692308"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8.40027 9.87573C9.21595 9.87573 9.8772 9.21449 9.8772 8.3988C9.8772 7.58312 9.21595 6.92188 8.40027 6.92188C7.58459 6.92188 6.92334 7.58312 6.92334 8.3988C6.92334 9.21449 7.58459 9.87573 8.40027 9.87573Z"
                  stroke="#C28E5C"
                  strokeWidth="0.692308"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10.154 10.1529L9.6925 9.69141"
                  stroke="#C28E5C"
                  strokeWidth="0.692308"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className={styles.statValue}>{eventData.staffCount}</div>
            <div className={styles.statLabel}>{t("number_of_staff")}</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.iconContainer}>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8.30799 3.30342C8.2803 3.2988 8.24799 3.2988 8.2203 3.30342C7.58338 3.28034 7.07568 2.7588 7.07568 2.11265C7.07568 1.45265 7.60645 0.921875 8.26645 0.921875C8.92645 0.921875 9.45722 1.45726 9.45722 2.11265C9.45261 2.7588 8.94491 3.28034 8.30799 3.30342Z"
                  stroke="#C28E5C"
                  strokeWidth="0.692308"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M7.83276 6.66289C8.46506 6.76904 9.16199 6.65827 9.65122 6.33058C10.302 5.89673 10.302 5.18596 9.65122 4.75212C9.15737 4.42443 8.45122 4.31365 7.81891 4.42442"
                  stroke="#C28E5C"
                  strokeWidth="0.692308"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2.75525 3.30342C2.78294 3.2988 2.81525 3.2988 2.84294 3.30342C3.47986 3.28034 3.98756 2.7588 3.98756 2.11265C3.98756 1.45265 3.45679 0.921875 2.79679 0.921875C2.13679 0.921875 1.60602 1.45726 1.60602 2.11265C1.61063 2.7588 2.11833 3.28034 2.75525 3.30342Z"
                  stroke="#C28E5C"
                  strokeWidth="0.692308"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3.23061 6.66289C2.5983 6.76904 1.90138 6.65827 1.41215 6.33058C0.76138 5.89673 0.76138 5.18596 1.41215 4.75212C1.906 4.42443 2.61215 4.31365 3.24446 4.42442"
                  stroke="#C28E5C"
                  strokeWidth="0.692308"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M5.53864 6.75263C5.51095 6.74802 5.47864 6.74802 5.45095 6.75263C4.81403 6.72956 4.30634 6.20802 4.30634 5.56186C4.30634 4.90186 4.8371 4.37109 5.4971 4.37109C6.1571 4.37109 6.68787 4.90648 6.68787 5.56186C6.68326 6.20802 6.17557 6.73417 5.53864 6.75263Z"
                  stroke="#C28E5C"
                  strokeWidth="0.692308"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4.19535 8.20677C3.54458 8.64061 3.54458 9.35138 4.19535 9.78523C4.93381 10.2791 6.14304 10.2791 6.88151 9.78523C7.53228 9.35138 7.53228 8.64061 6.88151 8.20677C6.14766 7.71754 4.93381 7.71754 4.19535 8.20677Z"
                  stroke="#C28E5C"
                  strokeWidth="0.692308"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className={styles.statValue}>{eventData.guests}</div>
            <div className={styles.statLabel}>{t("number_of_invitees")}</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.iconContainer}>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3.69232 0.921875V2.30649"
                  stroke="#C28E5C"
                  strokeWidth="0.692308"
                  strokeMiterlimit="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M7.38464 0.921875V2.30649"
                  stroke="#C28E5C"
                  strokeWidth="0.692308"
                  strokeMiterlimit="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M7.38464 1.61719C8.92157 1.70026 9.69234 2.28642 9.69234 4.45565V7.30796C9.69234 9.2095 9.2308 10.1603 6.92311 10.1603H4.15387C1.84618 10.1603 1.38464 9.2095 1.38464 7.30796V4.45565C1.38464 2.28642 2.15541 1.70488 3.69234 1.61719H7.38464Z"
                  stroke="#C28E5C"
                  strokeWidth="0.692308"
                  strokeMiterlimit="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9.57692 8.125H1.5"
                  stroke="#C28E5C"
                  strokeWidth="0.692308"
                  strokeMiterlimit="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M5.53849 3.80859C4.9708 3.80859 4.4908 4.11782 4.4908 4.71782C4.4908 5.00398 4.62464 5.2209 4.82772 5.35936C4.54618 5.52552 4.38464 5.79321 4.38464 6.10706C4.38464 6.67936 4.82311 7.03475 5.53849 7.03475C6.24926 7.03475 6.69234 6.67936 6.69234 6.10706C6.69234 5.79321 6.5308 5.5209 6.24464 5.35936C6.45234 5.21629 6.58157 5.00398 6.58157 4.71782C6.58157 4.11782 6.10618 3.80859 5.53849 3.80859ZM5.53849 5.11936C5.29849 5.11936 5.12311 4.97629 5.12311 4.75013C5.12311 4.51936 5.29849 4.38552 5.53849 4.38552C5.77849 4.38552 5.95387 4.51936 5.95387 4.75013C5.95387 4.97629 5.77849 5.11936 5.53849 5.11936ZM5.53849 6.46244C5.23387 6.46244 5.01234 6.31013 5.01234 6.03321C5.01234 5.75629 5.23387 5.60859 5.53849 5.60859C5.84311 5.60859 6.06464 5.7609 6.06464 6.03321C6.06464 6.31013 5.84311 6.46244 5.53849 6.46244Z"
                  fill="#C28E5C"
                />
              </svg>
            </div>
            <div className={styles.statValue}>{eventData.date}</div>
            <div className={styles.statLabel}>{t("event_date")}</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.iconContainer}>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3.69232 0.921875V2.30649"
                  stroke="#C28E5C"
                  strokeWidth="0.692308"
                  strokeMiterlimit="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M7.38464 0.921875V2.30649"
                  stroke="#C28E5C"
                  strokeWidth="0.692308"
                  strokeMiterlimit="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M1.61536 4.19531H9.46151"
                  stroke="#C28E5C"
                  strokeWidth="0.692308"
                  strokeMiterlimit="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9.69234 3.92488V7.84796C9.69234 9.23257 9.00003 10.1556 7.38464 10.1556H3.69234C2.07695 10.1556 1.38464 9.23257 1.38464 7.84796V3.92488C1.38464 2.54026 2.07695 1.61719 3.69234 1.61719H7.38464C9.00003 1.61719 9.69234 2.54026 9.69234 3.92488Z"
                  stroke="#C28E5C"
                  strokeWidth="0.692308"
                  strokeMiterlimit="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className={styles.statValue}>{eventData.eventType}</div>
            <div className={styles.statLabel}>{t("event_type")}</div>
          </div>
        </div>

        <div className={styles.detailsSection}>
          <div className={styles.detailsHeader}>{t("event_details")}</div>
          <div className={styles.detailsContent}>
            <div className={styles.eventTitle}>{eventData.eventName}</div>
            <div className={styles.invitationText}>
              {eventData.invitationText}
            </div>
            <div className={styles.eventDetails}>
              <div className={styles.detailRow}>
                <div className={styles.detailIcon}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M18 7.16C17.94 7.15 17.87 7.15 17.81 7.16C16.43 7.11 15.33 5.98 15.33 4.58C15.33 3.15 16.48 2 17.91 2C19.34 2 20.49 3.16 20.49 4.58C20.48 5.98 19.38 7.11 18 7.16Z"
                      stroke="#C28E5C"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M16.97 14.4402C18.34 14.6702 19.85 14.4302 20.91 13.7202C22.32 12.7802 22.32 11.2402 20.91 10.3002C19.84 9.59016 18.31 9.35016 16.94 9.59016"
                      stroke="#C28E5C"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M5.96998 7.16C6.02998 7.15 6.09998 7.15 6.15998 7.16C7.53998 7.11 8.63998 5.98 8.63998 4.58C8.63998 3.15 7.48998 2 6.05998 2C4.62998 2 3.47998 3.16 3.47998 4.58C3.48998 5.98 4.58998 7.11 5.96998 7.16Z"
                      stroke="#C28E5C"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M7 14.4402C5.63 14.6702 4.12 14.4302 3.06 13.7202C1.65 12.7802 1.65 11.2402 3.06 10.3002C4.13 9.59016 5.66 9.35016 7.03 9.59016"
                      stroke="#C28E5C"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 14.6288C11.94 14.6188 11.87 14.6188 11.81 14.6288C10.43 14.5788 9.32996 13.4488 9.32996 12.0488C9.32996 10.6188 10.48 9.46875 11.91 9.46875C13.34 9.46875 14.49 10.6288 14.49 12.0488C14.48 13.4488 13.38 14.5888 12 14.6288Z"
                      stroke="#C28E5C"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9.08997 17.7794C7.67997 18.7194 7.67997 20.2594 9.08997 21.1994C10.69 22.2694 13.31 22.2694 14.91 21.1994C16.32 20.2594 16.32 18.7194 14.91 17.7794C13.32 16.7194 10.69 16.7194 9.08997 17.7794Z"
                      stroke="#C28E5C"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div className={styles.detailValue}>
                  {eventData.guestCount} {t("invitees")}
                </div>
              </div>
              <div className={styles.detailRow}>
                <div className={styles.detailIcon}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M8 2V5"
                      stroke="#C28E5C"
                      strokeWidth="1.5"
                      strokeMiterlimit="10"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M16 2V5"
                      stroke="#C28E5C"
                      strokeWidth="1.5"
                      strokeMiterlimit="10"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M16 3.5C19.33 3.68 21 4.95 21 9.65V15.83C21 19.95 20 22.01 15 22.01H9C4 22.01 3 19.95 3 15.83V9.65C3 4.95 4.67 3.69 8 3.5H16Z"
                      stroke="#C28E5C"
                      strokeWidth="1.5"
                      strokeMiterlimit="10"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M20.75 17.6016H3.25"
                      stroke="#C28E5C"
                      strokeWidth="1.5"
                      strokeMiterlimit="10"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className={styles.detailValue}>{eventData.dateTime}</div>
              </div>
              {eventData.mapLink && (
                <div className={styles.detailRow}>
                  <div className={styles.detailIcon}>
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M3.27 12C2.48 11.05 2 9.83 2 8.5C2 5.48 4.47 3 7.5 3H12.5C15.52 3 18 5.48 18 8.5C18 11.52 15.53 14 12.5 14H10"
                        stroke="#C28E5C"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M20.73 12C21.52 12.95 22 14.17 22 15.5C22 18.52 19.53 21 16.5 21H11.5C8.48 21 6 18.52 6 15.5C6 12.48 8.47 10 11.5 10H14"
                        stroke="#C28E5C"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <a
                    href={eventData.mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.detailValue}
                  >
                    {t("view_on_map")}
                  </a>
                </div>
              )}
              {eventData.location && (
                <div className={styles.detailRow}>
                  <div className={styles.detailIcon}>
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 13.4314C13.7231 13.4314 15.12 12.0345 15.12 10.3114C15.12 8.58828 13.7231 7.19141 12 7.19141C10.2769 7.19141 8.88 8.58828 8.88 10.3114C8.88 12.0345 10.2769 13.4314 12 13.4314Z"
                        stroke="#C28E5C"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M3.62001 8.49C5.59001 -0.169998 18.42 -0.159997 20.38 8.5C21.53 13.58 18.37 17.88 15.6 20.54C13.59 22.48 10.41 22.48 8.39001 20.54C5.63001 17.88 2.47001 13.57 3.62001 8.49Z"
                        stroke="#C28E5C"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>

                  <div className={styles.detailValue}>{eventData.location}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {isScheduled && (
          <div className={styles.scheduleSection}>
            <div className={styles.scheduleHeader}>{t("ready_to_launch")}</div>
            <div className={styles.scheduleContent}>
              <div className={styles.scheduleText}>
                {t("ready_to_launch_description")}
              </div>
              <div className={styles.scheduledInfo}>
                <div className={styles.scheduledTitle}>{t("event_scheduled")}</div>
                <div className={styles.scheduledDetails}>
                  <div className={styles.scheduledItem}>
                    <span className={styles.scheduledValue}>
                      {eventData.scheduleDate}
                    </span>
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M8 2V5"
                        stroke="#C28E5C"
                        strokeWidth="1.5"
                        strokeMiterlimit="10"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M16 2V5"
                        stroke="#C28E5C"
                        strokeWidth="1.5"
                        strokeMiterlimit="10"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M16 3.5C19.33 3.68 21 4.95 21 9.65V15.83C21 19.95 20 22.01 15 22.01H9C4 22.01 3 19.95 3 15.83V9.65C3 4.95 4.67 3.69 8 3.5H16Z"
                        stroke="#C28E5C"
                        strokeWidth="1.5"
                        strokeMiterlimit="10"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M20.75 17.6016H3.25"
                        stroke="#C28E5C"
                        strokeWidth="1.5"
                        strokeMiterlimit="10"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className={styles.scheduledItem}>
                    <span className={styles.scheduledValue}>
                      {eventData.scheduleTime}
                    </span>
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M22 12C22 17.52 17.52 22 12 22C6.48 22 2 17.52 2 12C2 6.48 6.48 2 12 2C17.52 2 22 6.48 22 12Z"
                        stroke="#C28E5C"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M15.7099 15.1817L12.6099 13.3317C12.0699 13.0117 11.6299 12.2417 11.6299 11.6117V7.51172"
                        stroke="#C28E5C"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
                <div className={styles.scheduleActions}>
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={handleCancelSchedule}
                  >
                    <span className={styles.actionTextDanger}>
                      {t("cancel_schedule")}
                    </span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M14 3.98568C11.78 3.76568 9.54667 3.65234 7.32 3.65234C6 3.65234 4.68 3.71901 3.36 3.85234L2 3.98568"
                        stroke="#C0392B"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M5.66675 3.31203L5.81341 2.4387C5.92008 1.80536 6.00008 1.33203 7.12675 1.33203H8.87342C10.0001 1.33203 10.0867 1.83203 10.1867 2.44536L10.3334 3.31203"
                        stroke="#C0392B"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M12.5669 6.09375L12.1336 12.8071C12.0603 13.8537 12.0003 14.6671 10.1403 14.6671H5.86026C4.00026 14.6671 3.94026 13.8537 3.86693 12.8071L3.43359 6.09375"
                        stroke="#C0392B"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M6.88672 11H9.10672"
                        stroke="#C0392B"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M6.33325 8.33203H9.66659"
                        stroke="#C0392B"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={handleReschedule}
                  >
                    <span className={styles.actionText}>{t("reschedule")}</span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M5.33325 1.33203V3.33203"
                        stroke="#C28E5C"
                        strokeMiterlimit="10"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M10.6667 1.33203V3.33203"
                        stroke="#C28E5C"
                        strokeMiterlimit="10"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M2.33325 6.05859H13.6666"
                        stroke="#C28E5C"
                        strokeMiterlimit="10"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M12.8065 10.5109L10.4465 12.8709C10.3532 12.9643 10.2665 13.1376 10.2465 13.2642L10.1199 14.1643C10.0732 14.4909 10.2999 14.7176 10.6265 14.6709L11.5265 14.5443C11.6532 14.5243 11.8332 14.4376 11.9199 14.3442L14.2799 11.9843C14.6865 11.5776 14.8799 11.1043 14.2799 10.5043C13.6865 9.91093 13.2132 10.1042 12.8065 10.5109Z"
                        stroke="#C28E5C"
                        strokeMiterlimit="10"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <div className={styles.scheduleActions}>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={handleCopyLink}
                >
                  <span className={styles.actionText}>{t("copy_invitation_link")}</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10.6666 8.5987V11.3987C10.6666 13.732 9.73325 14.6654 7.39992 14.6654H4.59992C2.26659 14.6654 1.33325 13.732 1.33325 11.3987V8.5987C1.33325 6.26536 2.26659 5.33203 4.59992 5.33203H7.39992C9.73325 5.33203 10.6666 6.26536 10.6666 8.5987Z"
                      stroke="#2C2C2C"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M14.6666 4.5987V7.3987C14.6666 9.73203 13.7333 10.6654 11.3999 10.6654H10.6666V8.5987C10.6666 6.26536 9.73325 5.33203 7.39992 5.33203H5.33325V4.5987C5.33325 2.26536 6.26659 1.33203 8.59992 1.33203H11.3999C13.7333 1.33203 14.6666 2.26536 14.6666 4.5987Z"
                      stroke="#2C2C2C"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={handleShareLink}
                >
                  <span className={styles.actionText}>
                    {t("share_invitation")}
                  </span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M7.99935 1.33203V9.9987M7.99935 1.33203L10.666 3.9987M7.99935 1.33203L5.33268 3.9987M2.66602 7.9987V13.332C2.66602 13.6857 2.80649 14.0248 3.05654 14.2748C3.30659 14.5249 3.64573 14.6654 3.99935 14.6654H11.9993C12.353 14.6654 12.6921 14.5249 12.9422 14.2748C13.1922 14.0248 13.3327 13.6857 13.3327 13.332V7.9987"
                      stroke="#2C2C2C"
                      strokeWidth="1.33333"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={styles.checkboxSection}>
          <div className={styles.checkboxRow}>
            <div
              className={`${styles.checkbox} ${confirmChecked ? styles.checkboxChecked : ""
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
