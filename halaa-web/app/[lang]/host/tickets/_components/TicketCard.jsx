"use client";
import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import styles from "./TicketCard.module.css";
import { useTranslation } from "react-i18next";
import { useLocalizedDate } from "@/utils/date/useLocalizedDate";
import { ticketsKeys } from "@/hooks/tickets/keys";
import MediaViewerModal from "@/ui/commen/popup/MediaViewerModal";

const statusClassMap = {
  open: styles.statusOpen,
  in_progress: styles.statusInProgress,
  waiting_response: styles.statusWaitingResponse,
  resolved: styles.statusResolved,
  closed: styles.statusClosed,
};

const TicketCard = ({ ticket, onDelete, onEdit }) => {
  const { t } = useTranslation("tickets");
  const { formatDateTime } = useLocalizedDate();
  const queryClient = useQueryClient();
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);

  const statusModifier = statusClassMap[ticket.status] || styles.statusOpen;
  const title = t(`types.${ticket.type}`) || ticket.type;
  const description = ticket.message;
  const statusText = t(`status.${ticket.status}`) || ticket.status;
  const canEdit = ticket.status === "open";

  const formattedDateTime = formatDateTime(ticket.createdAt);

  const handleMouseEnter = () => {
    queryClient.prefetchQuery({
      queryKey: ticketsKeys.detail(ticket.id),
      staleTime: 2 * 60 * 1000,
    });
  };

  const getStatusIcon = () => {
    if (ticket.status === "open") {
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
            stroke="#1E40AF"
            strokeWidth="1.33333"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 5.33334V8"
            stroke="#1E40AF"
            strokeWidth="1.33333"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 10.6667H8.00667"
            stroke="#1E40AF"
            strokeWidth="1.33333"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    } else if (ticket.status === "in_progress" || ticket.status === "waiting_response") {
      const color = ticket.status === "waiting_response" ? "#6B21A8" : "#EAB308";
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
            stroke={color}
            strokeWidth="1.33333"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 4V8L10.6667 9.33333"
            stroke={color}
            strokeWidth="1.33333"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    }
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
  };

  return (
    <div className={styles.card} onMouseEnter={handleMouseEnter}>
      <div className={styles.cardContent}>
        <div className={styles.mainContent}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.description}>{description}</p>

          {ticket.attachment?.url && (
            <div className={styles.attachmentRow}>
              <button
                type="button"
                className={styles.attachmentButton}
                onClick={() => setIsAttachmentOpen(true)}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                <span>
                  {ticket.attachment.type === "video"
                    ? t("popup.video", "Video")
                    : t("popup.image", "Image")}
                </span>
              </button>
            </div>
          )}

          <div className={styles.timestamp}>
            <span>{t("createdAt")} </span>
            <span>{formattedDateTime}</span>
          </div>
        </div>
        <div className={styles.sideContent}>
          <div className={styles.statusGroup}>
            <div className={styles.icon}>{getStatusIcon()}</div>
            <div className={`${styles.statusBadge} ${statusModifier}`}>
              <span>{statusText}</span>
            </div>
          </div>
          {canEdit && (
            <div className={styles.actions}>
              <button
                className={styles.actionButton}
                onClick={() => onDelete(ticket.id)}
              >
                {t("actions.delete")}
              </button>
              <button
                className={styles.actionButton}
                onClick={() => onEdit(ticket)}
              >
                {t("actions.edit")}
              </button>
            </div>
          )}
        </div>
      </div>

      {isAttachmentOpen && (
        <MediaViewerModal
          attachment={ticket.attachment}
          onClose={() => setIsAttachmentOpen(false)}
          closeLabel={t("popup.cancel", "Close")}
          openLabel={t("attachment.openNewTab", "Open in new tab")}
        />
      )}
    </div>
  );
};

export default TicketCard;
