"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaUser,
  FaClock,
} from "react-icons/fa";
import { useTicketMutation } from "@/hooks/reactQueryHooks/useTickets";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";
import styles from "./TicketDetailView.module.css";
import TicketResponsePopup from "../../_components/TicketResponsePopup";
import AssignTicketPopup from "../../_components/AssignTicketPopup";

const STATUS_CLASS_MAP = {
  open: styles.badgeOpen,
  in_progress: styles.badgeInProgress,
  resolved: styles.badgeResolved,
  closed: styles.badgeClosed,
};

const PRIORITY_CLASS_MAP = {
  urgent: styles.badgeUrgent,
  high: styles.badgeHigh,
  medium: styles.badgeMedium,
  low: styles.badgeLow,
};

const TicketDetailView = ({ ticket }) => {
  const router = useRouter();
  const { t } = useTranslation("adminTickets");
  const [isResolvePopupOpen, setIsResolvePopupOpen] = useState(false);
  const [isAssignPopupOpen, setIsAssignPopupOpen] = useState(false);

  const reopenMutation = useTicketMutation("updateStatus");

  const handleReopen = useCallback(async () => {
    try {
      await reopenMutation.mutateAsync({
        ticketId: ticket.id,
        status: "open",
      });
      toastUtils.success(t("messages.reopenSuccess", "Ticket reopened successfully"));
      router.refresh();
    } catch (error) {
      handleError(error, t, { fallbackMessage: "messages.reopenError" });
    }
  }, [reopenMutation, ticket, t, router]);

  const handleOpenAssign = useCallback(() => setIsAssignPopupOpen(true), []);
  const handleOpenResolve = useCallback(() => setIsResolvePopupOpen(true), []);
  const handleCloseAssign = useCallback(() => setIsAssignPopupOpen(false), []);
  const handleCloseResolve = useCallback(() => setIsResolvePopupOpen(false), []);

  const handleAssignSuccess = useCallback(() => {
    setIsAssignPopupOpen(false);
    router.refresh();
  }, [router]);

  const handleResolveSuccess = useCallback(() => {
    setIsResolvePopupOpen(false);
    router.refresh();
  }, [router]);

  if (!ticket) return null;

  const statusLabel = t(`status.${ticket.status}`, ticket.status);
  const priorityLabel = t(`priority.${ticket.priority}`, ticket.priority);
  const statusClass = STATUS_CLASS_MAP[ticket.status] || styles.badgeClosed;
  const priorityClass = PRIORITY_CLASS_MAP[ticket.priority] || styles.badgeMedium;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          <FaArrowLeft /> {t("actions.back", "Back to Tickets")}
        </button>
        <div className={styles.actions}>
          {ticket.status !== "resolved" && (
            <>
              <button onClick={handleOpenAssign} className={styles.actionButton}>
                {t("actions.assign")}
              </button>
              <button
                onClick={handleOpenResolve}
                className={`${styles.actionButton} ${styles.resolveButton}`}
              >
                {t("actions.resolve")}
              </button>
            </>
          )}
          {ticket.status === "resolved" && (
            <button
              onClick={handleReopen}
              className={`${styles.actionButton} ${styles.reopenButton}`}
              disabled={reopenMutation.isPending}
            >
              {t("actions.reopen")}
            </button>
          )}
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.mainCard}>
          <div className={styles.ticketHeader}>
            <h1 className={styles.ticketTitle}>
              #{ticket.ticketNumber} - {ticket.title || t("table.title")}
            </h1>
            <div className={styles.badges}>
              <span className={`${styles.badge} ${statusClass}`}>
                {statusLabel}
              </span>
              <span className={`${styles.badge} ${priorityClass}`}>
                {priorityLabel}
              </span>
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{t("close.originalMessage")}</h3>
            <p className={styles.message}>{ticket.message}</p>
          </div>

          {ticket.resolution && (
            <div className={`${styles.section} ${styles.resolutionSection}`}>
              <h3 className={styles.sectionTitle}>
                <FaCheckCircle /> {t("viewResolution.title")}
              </h3>
              <p className={styles.message}>{ticket.resolution.message}</p>
              <p className={styles.meta}>
                {t("viewResolution.resolvedBy")}: {ticket.resolution.by?.username || ticket.resolution.by}{" "}
                {t("viewResolution.resolvedAt")}: {new Date(ticket.resolution.at).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        <div className={styles.sidebar}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>{t("close.status")}</h3>
            <div className={styles.infoRow}>
              <FaUser className={styles.icon} />
              <div>
                <span className={styles.label}>{t("table.columns.submittedBy")}</span>
                <p>{ticket.user?.username || ticket.user?.email || t("assign.selectModerator")}</p>
                <p className={styles.subtext}>{ticket.user?.email}</p>
              </div>
            </div>
            <div className={styles.infoRow}>
              <FaClock className={styles.icon} />
              <div>
                <span className={styles.label}>{t("table.columns.createdAt")}</span>
                <p>{new Date(ticket.createdAt).toLocaleString()}</p>
              </div>
            </div>
            {ticket.assignedTo && (
              <div className={styles.infoRow}>
                <FaUser className={styles.icon} />
                <div>
                  <span className={styles.label}>{t("table.columns.assignedTo")}</span>
                  <p>{ticket.assignedTo.username || ticket.assignedTo.email}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isResolvePopupOpen && (
        <TicketResponsePopup
          ticket={ticket}
          onClose={handleCloseResolve}
          onSuccess={handleResolveSuccess}
        />
      )}

      {isAssignPopupOpen && (
        <AssignTicketPopup
          ticket={ticket}
          onClose={handleCloseAssign}
          onSuccess={handleAssignSuccess}
        />
      )}
    </div>
  );
};

export default TicketDetailView;
