"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import styles from "./summary.module.css";

const ScheduleSection = ({ eventData }) => {
  const { t } = useTranslation("createEvent");
  const isScheduled = Boolean(eventData?.scheduleDate && eventData?.scheduleTime);

  return (
    <div className={styles.scheduleSection}>
      <div className={styles.scheduleHeader}>{t("ready_to_launch", "جاهز للإطلاق")}</div>
      <div className={styles.scheduleContent}>
        <div className={styles.scheduleText}>
          {isScheduled
            ? t("scheduled_launch_description", "سيتم إرسال الدعوات تلقائياً في الموعد المحدد أدناه:")
            : t("ready_to_launch_description", "سيتم إرسال الدعوات للضيوف فور تأكيد الإطلاق.")}
        </div>
        {isScheduled && (
          <div className={styles.scheduledInfo}>
            <div className={styles.scheduledTitle}>{t("event_scheduled", "موعد إرسال الدعوات")}</div>
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
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleSection;
