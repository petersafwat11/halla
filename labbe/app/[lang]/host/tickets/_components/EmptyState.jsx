"use client";
import React from "react";
import styles from "./EmptyState.module.css";
import Button from "@/ui/commen/button/Button";

const EmptyState = ({ onCreateTicket, t }) => {
  return (
    <div className={styles.emptyState}>
      <div className={styles.iconWrapper}>
        <svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="60" cy="60" r="60" fill="#F8F9FA" />
          <path
            d="M60 35C46.1929 35 35 46.1929 35 60C35 73.8071 46.1929 85 60 85C73.8071 85 85 73.8071 85 60C85 46.1929 73.8071 35 60 35Z"
            stroke="#C28E5C"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M60 50V60L67.5 67.5"
            stroke="#C28E5C"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="60" cy="60" r="5" fill="#C28E5C" />
        </svg>
      </div>
      <div className={styles.textWrapper}>
        <h2 className={styles.title}>
          {t("noTickets.title") || "لا توجد شكاوى سابقة"}
        </h2>
        <p className={styles.message}>
          {t("noTickets.message") ||
            "إذا كنت بحاجة إلى إخبارنا بأي شيء، أرسل شكوى وسنهتم بها على الفور"}
        </p>
      </div>
      <Button
        variant="primary"
        title={t("noTickets.action") || "انشئ شكوى"}
        onClick={onCreateTicket}
        className={styles.button}
      />
    </div>
  );
};

export default EmptyState;
