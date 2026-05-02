"use client";
import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import styles from "./TicketCard.module.css";
import { useTranslation } from "react-i18next";
import { useLocalizedDate } from "@/utils/date/useLocalizedDate";

// Status config with colors
const statusConfig = {
  open: {
    bg: "#DBEAFE",
    color: "#1E40AF",
  },
  pending: {
    bg: "#DBEAFE",
    color: "#1E40AF",
  },
  in_progress: {
    bg: "#FEF9C3",
    color: "#854D0E",
  },
  resolved: {
    bg: "#DCFCE7",
    color: "#166534",
  },
  closed: {
    bg: "#F3F4F6",
    color: "#6B7280",
  },
};

const TicketCard = ({ ticket, onDelete, onEdit }) => {
  const { t } = useTranslation("tickets");
  const { formatDateTime } = useLocalizedDate();
  const queryClient = useQueryClient();

  const statusStyle = statusConfig[ticket.status] || statusConfig.pending;
  const title = t(`types.${ticket.type}`) || ticket.type;
  const description = ticket.message;
  const statusText = t(`status.${ticket.status}`) || ticket.status;

  // Use localized date formatting
  const formattedDateTime = formatDateTime(ticket.createdAt);

  // Prefetch ticket details on hover
  const handleMouseEnter = () => {
    queryClient.prefetchQuery({
      queryKey: ["tickets", ticket.id],
      staleTime: 2 * 60 * 1000,
    });
  };

  // Status icon
  const getStatusIcon = () => {
    if (ticket.status === "pending") {
      return (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M7.99992 14.6667C11.6818 14.6667 14.6666 11.6819 14.6666 8C14.6666 4.3181 11.6818 1.33334 7.99992 1.33334C4.31802 1.33334 1.33325 4.3181 1.33325 8C1.33325 11.6819 4.31802 14.6667 7.99992 14.6667Z"
            stroke="#C0392B"
            strokeWidth="1.33333"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 5.33334V8"
            stroke="#C0392B"
            strokeWidth="1.33333"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 10.6667H8.00667"
            stroke="#C0392B"
            strokeWidth="1.33333"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    } else if (ticket.status === "in_progress") {
      return (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M7.99992 14.6667C11.6818 14.6667 14.6666 11.6819 14.6666 8C14.6666 4.3181 11.6818 1.33333 7.99992 1.33333C4.31802 1.33333 1.33325 4.3181 1.33325 8C1.33325 11.6819 4.31802 14.6667 7.99992 14.6667Z"
            stroke="#EAB308"
            strokeWidth="1.33333"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 4V8L10.6667 9.33333"
            stroke="#EAB308"
            strokeWidth="1.33333"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    } else {
      return (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M14.6666 7.38666V8C14.6658 9.43761 14.2003 10.8364 13.3395 11.9879C12.4787 13.1393 11.2688 13.9816 9.89016 14.3893C8.51154 14.7969 7.03809 14.7479 5.68957 14.2497C4.34104 13.7515 3.18969 12.8307 2.40723 11.6247C1.62476 10.4187 1.25311 8.99204 1.3477 7.55754C1.44229 6.12304 1.99806 4.75755 2.93211 3.66471C3.86615 2.57188 5.12844 1.81025 6.53071 1.49343C7.93298 1.1766 9.4001 1.32155 10.7133 1.90666"
            stroke="#22C55E"
            strokeWidth="1.33333"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6 7.33334L8 9.33334L14.6667 2.66667"
            stroke="#22C55E"
            strokeWidth="1.33333"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    }
  };

  return (
    <div className={styles.card} onMouseEnter={handleMouseEnter}>
      <div className={styles.cardContent}>
        <div className={styles.mainContent}>
          <div className={styles.header}>
            <h3 className={styles.title}>{title}</h3>
            <div className={styles.icon}>{getStatusIcon()}</div>
            <div
              className={styles.statusBadge}
              style={{
                background: statusStyle.bg,
              }}
            >
              <span style={{ color: statusStyle.color }}>{statusText}</span>
            </div>
          </div>
          <p className={styles.description}>{description}</p>
          <div className={styles.timestamp}>
            <span>{t("createdAt") || "تم الإنشاء:"} </span>
            <span>{formattedDateTime}</span>
          </div>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.actionButton}
            onClick={() => onDelete(ticket.id)}
          >
            {t("actions.delete") || "حذف"}
          </button>
          <button
            className={styles.actionButton}
            onClick={() => onEdit(ticket)}
          >
            {t("actions.edit") || "تعديل"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketCard;
