"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationCircle,
  FaUser,
  FaClock,
} from "react-icons/fa";
import { toast } from "react-toastify";
import styles from "./TicketDetailView.module.css";
import { cookieUtils } from "@/utils/cookieUtils";
import adminDashboardAPI from "@/services/adminDashboard";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import TicketResponsePopup from "../../_components/TicketResponsePopup";
import AssignTicketPopup from "../../_components/AssignTicketPopup";

const TicketDetailView = ({ ticket }) => {
  const router = useRouter();
  const { t } = useTranslation("adminTickets");
  const [isResolvePopupOpen, setIsResolvePopupOpen] = useState(false);
  const [isAssignPopupOpen, setIsAssignPopupOpen] = useState(false);

  if (!ticket) return null;

  const handleReopen = async () => {
    try {
      const token = cookieUtils.getCookie("token");
      await adminDashboardAPI.tickets.reopenTicket(ticket.id || ticket._id, token);
      toast.success(t("messages.reopenSuccess", "Ticket reopened successfully"));
      router.refresh();
    } catch (error) {
      console.error("Error reopening ticket:", error);
      toast.error(t("messages.reopenError", "Failed to reopen ticket"));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "open":
        return "#f59e0b"; // Orange
      case "in_progress":
        return "#3b82f6"; // Blue
      case "resolved":
        return "#10b981"; // Green
      case "closed":
        return "#6b7280"; // Gray
      default:
        return "#6b7280";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "urgent":
        return "#ef4444"; // Red
      case "high":
        return "#f97316"; // Orange
      case "medium":
        return "#3b82f6"; // Blue
      case "low":
        return "#10b981"; // Green
      default:
        return "#6b7280";
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          <FaArrowLeft /> {t("actions.back", "Back to Tickets")}
        </button>
        <div className={styles.actions}>
          {ticket.status !== "resolved" && (
            <>
              <button
                onClick={() => setIsAssignPopupOpen(true)}
                className={styles.actionButton}
              >
                {t("actions.assign", "Assign")}
              </button>
              <button
                onClick={() => setIsResolvePopupOpen(true)}
                className={`${styles.actionButton} ${styles.resolveButton}`}
              >
                {t("actions.resolve", "Resolve")}
              </button>
            </>
          )}
          {ticket.status === "resolved" && (
            <button
              onClick={handleReopen}
              className={`${styles.actionButton} ${styles.reopenButton}`}
            >
              {t("actions.reopen", "Reopen")}
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.content}>
        <div className={styles.mainCard}>
          <div className={styles.ticketHeader}>
            <h1 className={styles.ticketTitle}>
              #{ticket.ticketNumber} - {ticket.title || t("noTitle", "No Title")}
            </h1>
            <div className={styles.badges}>
              <span
                className={styles.badge}
                style={{ backgroundColor: getStatusColor(ticket.status) }}
              >
                {ticket.status}
              </span>
              <span
                className={styles.badge}
                style={{ backgroundColor: getPriorityColor(ticket.priority) }}
              >
                {ticket.priority}
              </span>
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{t("details.message", "Message")}</h3>
            <p className={styles.message}>{ticket.message}</p>
          </div>

          {ticket.resolution && (
            <div className={`${styles.section} ${styles.resolutionSection}`}>
               <h3 className={styles.sectionTitle}>
                 <FaCheckCircle /> {t("details.resolution", "Resolution")}
               </h3>
               <p className={styles.message}>{ticket.resolution.message}</p>
               <p className={styles.meta}>
                 {t("details.resolvedBy", "Resolved by")}: {ticket.resolution.by?.name} on{" "}
                 {new Date(ticket.resolution.at).toLocaleDateString()}
               </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className={styles.sidebar}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>{t("details.info", "Info")}</h3>
            <div className={styles.infoRow}>
              <FaUser className={styles.icon} />
              <div>
                <span className={styles.label}>{t("details.submittedBy", "Submitted By")}</span>
                <p>{ticket.submittedBy?.name || ticket.submittedBy?.username || "Unknown"}</p>
                <p className={styles.subtext}>{ticket.submittedBy?.email}</p>
              </div>
            </div>
            <div className={styles.infoRow}>
              <FaClock className={styles.icon} />
              <div>
                 <span className={styles.label}>{t("details.created", "Created At")}</span>
                 <p>{new Date(ticket.createdAt).toLocaleString()}</p>
              </div>
            </div>
            {ticket.assignedTo && (
               <div className={styles.infoRow}>
                 <FaUser className={styles.icon} />
                 <div>
                   <span className={styles.label}>{t("details.assignedTo", "Assigned To")}</span>
                   <p>{ticket.assignedTo.name || ticket.assignedTo.username}</p>
                 </div>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* Popups */}
      <PopupLayout
        isOpen={isResolvePopupOpen}
        onClose={() => setIsResolvePopupOpen(false)}
      >
        <TicketResponsePopup
          ticket={ticket}
          onClose={() => setIsResolvePopupOpen(false)}
          onSuccess={() => {
            setIsResolvePopupOpen(false);
            router.refresh();
          }}
        />
      </PopupLayout>

      <PopupLayout
        isOpen={isAssignPopupOpen}
        onClose={() => setIsAssignPopupOpen(false)}
      >
        <AssignTicketPopup
          ticket={ticket}
          onClose={() => setIsAssignPopupOpen(false)}
          onSuccess={() => {
            setIsAssignPopupOpen(false);
            router.refresh();
          }}
        />
      </PopupLayout>
    </div>
  );
};

export default TicketDetailView;
