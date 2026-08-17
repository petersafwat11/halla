"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import styles from "./summary.module.css";

const ScheduleSection = ({
  eventData,
  handleCancelSchedule,
  handleReschedule,
  handleCopyLink,
  handleShareLink,
}) => {
  const { t } = useTranslation("createEvent");

  return (
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
  );
};

export default ScheduleSection;
