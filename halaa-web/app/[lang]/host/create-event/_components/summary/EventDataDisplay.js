"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import styles from "./summary.module.css";

const EventDataDisplay = ({ eventData }) => {
  const { t } = useTranslation("createEvent");

  return (
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
  );
};

export default EventDataDisplay;
