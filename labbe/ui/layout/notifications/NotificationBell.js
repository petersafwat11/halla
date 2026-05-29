"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useUnreadNotificationCount } from "@/hooks/notifications";
import NotificationDropdown from "./NotificationDropdown";
import { getDashboardTypeFromPath, getBasePath } from "@/ui/layout/navConfig";
import styles from "./notifications.module.css";

const NotificationBell = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const { data: unreadCountResponse } = useUnreadNotificationCount();
  const unreadCount = unreadCountResponse?.data?.unreadCount ?? 0;

  const dashboardType = getDashboardTypeFromPath(pathname);
  const basePath = getBasePath(dashboardType);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  const formatCount = (count) => {
    if (count > 99) return "99+";
    return count.toString();
  };

  return (
    <div className={styles.bellContainer} ref={dropdownRef}>
      <button
        className={styles.bellButton}
        onClick={toggleDropdown}
        aria-label={`Notifications${
          unreadCount > 0 ? ` (${unreadCount} unread)` : ""
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <img src="/svg/events/notification.svg" alt="notifications" />
        {unreadCount > 0 && (
          <span className={styles.badge} aria-hidden="true">
            {formatCount(unreadCount)}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationDropdown onClose={closeDropdown} basePath={basePath} />
      )}
    </div>
  );
};

export default NotificationBell;
