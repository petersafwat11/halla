/**
 * Notification Empty State Component
 * Displays when there are no notifications
 */

"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { IoNotificationsOutline } from "react-icons/io5";
import styles from "./notifications.module.css";

const NotificationEmpty = () => {
  const { t } = useTranslation("common");

  return (
    <div className={styles.emptyState}>
      <IoNotificationsOutline className={styles.emptyIcon} />
      <h4 className={styles.emptyTitle}>
        {t("notifications.empty.title", "No notifications")}
      </h4>
      <p className={styles.emptyMessage}>
        {t(
          "notifications.empty.message",
          "You're all caught up! Check back later."
        )}
      </p>
    </div>
  );
};

export default NotificationEmpty;
