"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import { IoCheckmarkDoneOutline, IoTrashOutline } from "react-icons/io5";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { useNotificationMutation } from "@/hooks/reactQueryHooks/useNotifications";
import NotificationItem from "./NotificationItem";
import NotificationEmpty from "./NotificationEmpty";
import styles from "./notifications.module.css";

const PAGE_LIMIT = 20;

const NotificationDropdown = ({ onClose, basePath = "" }) => {
  const { t } = useTranslation("common");
  const router = useRouter();

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["notifications", "dropdown", PAGE_LIMIT],
    queryFn: ({ pageParam = 1 }) =>
      apiRequest({
        method: "GET",
        path: API_PATHS.notifications.getNotifications,
        params: { page: pageParam, limit: PAGE_LIMIT },
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const p = lastPage?.data?.pagination;
      if (!p) return undefined;
      return p.page < p.pages ? p.page + 1 : undefined;
    },
    staleTime: 30 * 1000,
  });

  const notifications =
    data?.pages?.flatMap((page) => page?.data?.notifications ?? []) ?? [];

  const markAsReadMutation = useNotificationMutation("markAsRead");
  const markAllAsReadMutation = useNotificationMutation("markAllAsRead");
  const deleteNotificationMutation = useNotificationMutation("deleteNotification");
  const clearAllMutation = useNotificationMutation("clearAll");

  const handleNotificationClick = (notification) => {
    if (notification.actionUrl) {
      const metadata = notification.data?.metadata || {};
      const currentLang = window.location.pathname.split("/")[1] || "ar";

      let targetUrl = notification.actionUrl;

      const urlMappings = [
        { en: "ratingUrlEn", ar: "ratingUrlAr" },
        { en: "ticketsPageEn", ar: "ticketsPageAr" },
        { en: "userTicketsEn", ar: "userTicketsAr" },
        { en: "hostEventsEn", ar: "hostEventsAr" },
        { en: "adminEventsEn", ar: "adminEventsAr" },
        { en: "adminVendorsEn", ar: "adminVendorsAr" },
        { en: "vendorDashEn", ar: "vendorDashAr" },
        { en: "hostEventEn", ar: "hostEventAr" },
      ];

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

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleClearAll = () => {
    if (
      window.confirm(
        t(
          "notifications.clearAllConfirm",
          "Are you sure you want to clear all notifications?"
        )
      )
    ) {
      clearAllMutation.mutate();
    }
  };

  return (
    <div className={styles.dropdownContainer}>
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
                onRead={(id) => markAsReadMutation.mutate(id)}
                onDelete={(id) => deleteNotificationMutation.mutate(id)}
                onClick={handleNotificationClick}
              />
            ))}

            {hasNextPage && (
              <button
                className={styles.loadMoreButton}
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage
                  ? t("notifications.loading", "Loading...")
                  : t("notifications.loadMore", "Load more")}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;
