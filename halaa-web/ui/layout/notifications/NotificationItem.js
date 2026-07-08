/**
 * Notification Item Component
 * Displays a single notification in the list
 */

"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { IoClose } from "react-icons/io5";
import {
  IoCalendarOutline,
  IoPersonOutline,
  IoCheckmarkCircleOutline,
  IoAlertCircleOutline,
  IoCardOutline,
  IoTicketOutline,
  IoStarOutline,
  IoMegaphoneOutline,
  IoNotificationsOutline,
  IoTimeOutline,
  IoSendOutline,
  IoEyeOutline,
} from "react-icons/io5";
import styles from "./notifications.module.css";

// ============================================
// ICON MAPPING
// ============================================

const getIconComponent = (type) => {
  const iconMap = {
    // Event
    event_created: IoCalendarOutline,
    event_reminder: IoTimeOutline,
    event_status_change: IoCalendarOutline,
    event_completed: IoCheckmarkCircleOutline,
    event_cancelled: IoAlertCircleOutline,

    // Guest
    guest_rsvp_accepted: IoPersonOutline,
    guest_rsvp_declined: IoPersonOutline,
    guest_rsvp_maybe: IoPersonOutline,
    guest_checked_in: IoCheckmarkCircleOutline,
    invitations_sent: IoSendOutline,

    // Subscription
    subscription_expiring: IoTimeOutline,
    subscription_renewed: IoCheckmarkCircleOutline,
    subscription_expired: IoAlertCircleOutline,
    plan_limit_warning: IoAlertCircleOutline,
    payment_successful: IoCardOutline,
    payment_failed: IoAlertCircleOutline,

    // User
    user_registered: IoPersonOutline,
    vendor_pending_approval: IoPersonOutline,
    vendor_approved: IoCheckmarkCircleOutline,
    vendor_rejected: IoAlertCircleOutline,
    profile_incomplete: IoPersonOutline,
    welcome: IoCheckmarkCircleOutline,

    // Support
    ticket_created: IoTicketOutline,
    ticket_assigned: IoTicketOutline,
    ticket_response: IoTicketOutline,
    ticket_resolved: IoCheckmarkCircleOutline,

    // Admin
    system_alert: IoAlertCircleOutline,
    revenue_report: IoCardOutline,
    usage_report: IoEyeOutline,

    // Vendor
    service_inquiry: IoPersonOutline,
    service_booking: IoCalendarOutline,
    new_review: IoStarOutline,
    service_views_milestone: IoEyeOutline,

    // General
    announcement: IoMegaphoneOutline,
    custom: IoNotificationsOutline,
  };

  return iconMap[type] || IoNotificationsOutline;
};

// ============================================
// COMPONENT
// ============================================

const NotificationItem = ({ notification, onRead, onDelete, onClick }) => {
  const { t, i18n } = useTranslation("common");

  const { id, type, isRead, priority, timeAgo, actionUrl } = notification;
  const isAr = i18n.language === "ar";
  const title = (isAr && notification.titleAr) || notification.title;
  const message = (isAr && notification.messageAr) || notification.message;

  const IconComponent = getIconComponent(type);

  const handleClick = () => {
    if (!isRead && onRead) {
      onRead(id);
    }
    if (onClick) {
      onClick(notification);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(id);
    }
  };

  const getPriorityClass = () => {
    if (priority === "high" || priority === "urgent") {
      return styles[`priority-${priority}`];
    }
    return "";
  };

  return (
    <div
      className={`${styles.notificationItem} ${!isRead ? styles.unread : ""}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
    >
      {/* Icon */}
      <div className={`${styles.notificationIcon} ${getPriorityClass()}`}>
        <IconComponent />
      </div>

      {/* Content */}
      <div className={styles.notificationContent}>
        <h4 className={styles.notificationTitle}>{title}</h4>
        <p className={styles.notificationMessage}>{message}</p>
        <div className={styles.notificationMeta}>
          <span className={styles.notificationTime}>{timeAgo}</span>
          {!isRead && <span className={styles.unreadDot} />}
        </div>
      </div>

      {/* Actions */}
      <div className={styles.notificationActions}>
        <button
          className={styles.deleteButton}
          onClick={handleDelete}
          aria-label={t("delete")}
        >
          <IoClose />
        </button>
      </div>
    </div>
  );
};

export default NotificationItem;
