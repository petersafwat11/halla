"use client";
import React from "react";
import ListItem from "../listItem/ListItem";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import styles from "./list.module.css";

export default function List({ guests = [], t, loading, onGuestClick }) {
  if (loading) {
    return (
      <div className={styles.listSection}>
        <SimpleLoading message={t("loading")} />
      </div>
    );
  }

  return (
    <div className={styles.listSection}>
      <div className={styles.listContainer}>
        <div className={styles.listCard}>
          <div className={styles.tabHeader}>
            <div className={styles.tabList}>
              <div className={styles.tabItem}>
                <div className={styles.tabTitle}>
                  <span className={styles.tabText}>{t("guests")}</span>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className={styles.tabIcon}
                >
                  <path
                    d="M11.9987 4.77203C11.9587 4.76537 11.9121 4.76537 11.8721 4.77203C10.9521 4.7387 10.2188 3.98537 10.2188 3.05203C10.2188 2.0987 10.9854 1.33203 11.9387 1.33203C12.8921 1.33203 13.6587 2.10537 13.6587 3.05203C13.6521 3.98537 12.9187 4.7387 11.9987 4.77203Z"
                    stroke="#2C2C2C"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M11.313 9.62547C12.2263 9.77881 13.233 9.6188 13.9396 9.14547C14.8796 8.5188 14.8796 7.49214 13.9396 6.86547C13.2263 6.39214 12.2063 6.23214 11.293 6.39214"
                    stroke="#2C2C2C"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M3.98031 4.77203C4.02031 4.76537 4.06698 4.76537 4.10698 4.77203C5.02698 4.7387 5.76031 3.98537 5.76031 3.05203C5.76031 2.0987 4.99365 1.33203 4.04031 1.33203C3.08698 1.33203 2.32031 2.10537 2.32031 3.05203C2.32698 3.98537 3.06031 4.7387 3.98031 4.77203Z"
                    stroke="#2C2C2C"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4.6676 9.62547C3.75427 9.77881 2.7476 9.6188 2.04094 9.14547C1.10094 8.5188 1.10094 7.49214 2.04094 6.86547C2.75427 6.39214 3.77427 6.23214 4.6876 6.39214"
                    stroke="#2C2C2C"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M7.99875 9.7525C7.95875 9.74584 7.91208 9.74584 7.87208 9.7525C6.95208 9.71917 6.21875 8.96583 6.21875 8.0325C6.21875 7.07917 6.98542 6.3125 7.93875 6.3125C8.89208 6.3125 9.65875 7.08583 9.65875 8.0325C9.65208 8.96583 8.91875 9.72584 7.99875 9.7525Z"
                    stroke="#2C2C2C"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6.06047 11.8542C5.12047 12.4809 5.12047 13.5076 6.06047 14.1342C7.12714 14.8476 8.8738 14.8476 9.94047 14.1342C10.8805 13.5076 10.8805 12.4809 9.94047 11.8542C8.88047 11.1476 7.12714 11.1476 6.06047 11.8542Z"
                    stroke="#2C2C2C"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className={styles.guestsList}>
            {guests.length === 0 ? (
              <p className={styles.emptyState}>{t("noGuests")}</p>
            ) : (
              guests.map((guest, index) => (
                <ListItem key={guest._id || index} guest={guest} onGuestClick={onGuestClick} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
