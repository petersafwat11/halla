/**
 * Notification Dropdown Component
 * Displays notification list in a dropdown panel
 */

"use client";

import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { IoCheckmarkDoneOutline, IoTrashOutline } from "react-icons/io5";
import useNotificationStore from "@/stores/notificationStore";
import NotificationItem from "./NotificationItem";
import NotificationEmpty from "./NotificationEmpty";
import styles from "./notifications.module.css";

// ============================================
// COMPONENT
// ============================================

const NotificationDropdown = ({ onClose, basePath = "" }) => {
  const { t } = useTranslation("common");
  const router = useRouter();

  const {
    notifications,
    isLoading,
    isLoadingMore,
    pagination,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotificationStore();

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications({ refresh: true });
  }, [fetchNotifications]);

  const handleNotificationClick = (notification) => {
    if (notification.actionUrl) {
      // Check if notification has language-specific URLs in metadata
      const metadata = notification.data?.metadata || {};
      const currentLang = window.location.pathname.split("/")[1] || "ar";

      // Use language-specific URL if available
      let targetUrl = notification.actionUrl;

      // Map of all possible language-specific URL pairs
      const urlMappings = [
        { en: "ratingUrlEn", ar: "ratingUrlAr" }, // Ticket rating
        { en: "ticketsPageEn", ar: "ticketsPageAr" }, // Admin tickets
        { en: "userTicketsEn", ar: "userTicketsAr" }, // User tickets
        { en: "hostEventsEn", ar: "hostEventsAr" }, // Host events
        { en: "adminEventsEn", ar: "adminEventsAr" }, // Admin events
        { en: "adminVendorsEn", ar: "adminVendorsAr" }, // Admin vendors
        { en: "vendorDashEn", ar: "vendorDashAr" }, // Vendor dashboard
        { en: "hostEventEn", ar: "hostEventAr" }, // Single host event (RSVP)
      ];

      // Find matching URL based on current language
      for (const mapping of urlMappings) {
        if (currentLang === "en" && metadata[mapping.en]) {
          targetUrl = metadata[mapping.en];
          break;
        } else if (currentLang === "ar" && metadata[mapping.ar]) {
          targetUrl = metadata[mapping.ar];
          break;
        }
      }

      router.push(targetUrl);
      onClose?.();
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleClearAll = async () => {
    if (
      window.confirm(
        t(
          "notifications.clearAllConfirm",
          "Are you sure you want to clear all notifications?"
        )
      )
    ) {
      await clearAll();
    }
  };

  const handleLoadMore = () => {
    fetchNotifications({ loadMore: true });
  };

  const handleViewAll = () => {
    router.push(`${basePath}/notifications`);
    onClose?.();
  };

  return (
    <div className={styles.dropdownContainer}>
      {/* Header */}
      <div className={styles.dropdownHeader}>
        <h3 className={styles.dropdownTitle}>
          {t("notifications.title", "Notifications")}
        </h3>
        <div className={styles.dropdownActions}>
          <button
            className={styles.actionButton}
            onClick={handleMarkAllAsRead}
            title={t("notifications.markAllRead", "Mark all as read")}
          >
            <IoCheckmarkDoneOutline size={16} />
          </button>
          <button
            className={styles.actionButton}
            onClick={handleClearAll}
            title={t("notifications.clearAll", "Clear all")}
          >
            <IoTrashOutline size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={styles.dropdownContent}>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner} />
          </div>
        ) : notifications.length === 0 ? (
          <NotificationEmpty />
        ) : (
          <>
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={markAsRead}
                onDelete={deleteNotification}
                onClick={handleNotificationClick}
              />
            ))}

            {/* Load More */}
            {pagination.hasMore && (
              <button
                className={styles.loadMoreButton}
                onClick={handleLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore
                  ? t("notifications.loading", "Loading...")
                  : t("notifications.loadMore", "Load more")}
              </button>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {/* {notifications.length > 0 && (
        <div className={styles.dropdownFooter}>
          <button className={styles.viewAllLink} onClick={handleViewAll}>
            {t("notifications.viewAll", "View all notifications")}
          </button>
        </div>
      )} */}
    </div>
  );
};

export default NotificationDropdown;
