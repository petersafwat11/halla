"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "next/navigation";
import { toast } from "react-toastify";
import Table from "@/ui/commen/new-table/Table";
import Button from "@/ui/commen/button/Button";
import PopupWrapper from "@/ui/host/popups/popupWrapper/PopupWrapper";
import AddGuestPopup from "@/ui/host/popups/addGuestPopup/AddGuestPopup";
import ReminderPopup from "@/ui/host/popups/reminderPopup/ReminderPopup";
import SendInvitationPopup from "@/ui/host/popups/sendInvitationPopup/SendInvitationPopup";
import DeleteConfirmation from "@/ui/vendor/modals/DeleteConfirmation";
import styles from "../singleEvent.module.css";
import { useEvent, useEventMutation } from "@/hooks/reactQueryHooks/useEvents";
import { useEventGuests } from "@/hooks/events/queries/useEventGuests";
import { useLocalizedDate } from "@/utils/date/useLocalizedDate";
import { useQueryClient } from "@tanstack/react-query";
import { downloadExportFile } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

export default function GuestTable({ eventId }) {
  const { t } = useTranslation("home-events");
  const { formatDate } = useLocalizedDate();
  const queryClient = useQueryClient();

  // React Query hooks
  const { data: eventData } = useEvent(eventId);
  const { data: guestsData } = useEventGuests(eventId);
  const deleteGuestMutation = useEventMutation("deleteGuest");
  const updateGuestMutation = useEventMutation("updateGuest");

  // Extract data
  const actualEventData = eventData?.data || eventData;
  const guests = guestsData?.data || guestsData || [];

  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showReminderPopup, setShowReminderPopup] = useState(false);
  const [showInvitationPopup, setShowInvitationPopup] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [isSendingInvitation, setIsSendingInvitation] = useState(false);
  const [selectedGuests, setSelectedGuests] = useState([]);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    guest: null,
  });

  const handleExportGuests = async () => {
    try {
      const result = await downloadExportFile({
        path: API_PATHS.events.exportEventGuestsAsExcel(eventId),
        filename: `guests-event-${eventId}.xlsx`,
      });

      if (result.success) {
        toast.success(t("singleEvent.guestTable.exportSuccess"));
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error(t("singleEvent.guestTable.exportError"));
    }
  };

  const handleEditGuest = (guest) => {
    setEditingGuest(guest);
    setShowEditPopup(true);
  };

  const handleDeleteGuest = (guest, e) => {
    if (e) {
      e.stopPropagation();
    }

    if (!guest.id) {
      toast.error(t("errors.noGuestId", "Guest ID not found"));
      return;
    }

    setDeleteModal({ isOpen: true, guest });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.guest) return;

    const guestId = deleteModal.guest.id;

    // Optimistic update
    const previousGuests = queryClient.getQueryData(["guests", "events", eventId]);

    queryClient.setQueryData(["guests", "events", eventId], (old) => {
      if (!old) return old;
      const oldData = old.data || old;
      return {
        ...old,
        data: oldData.filter((g) => (g.id) !== guestId),
      };
    });

    try {
      await deleteGuestMutation.mutateAsync({
        eventId,
        guestId,
      });
      toast.success(t("singleEvent.guestTable.deleteSuccess"));
    } catch (error) {
      // Rollback on error
      queryClient.setQueryData(["guests", "events", eventId], previousGuests);
      console.error("Delete error:", error);
      toast.error(t("singleEvent.guestTable.deleteError"));
    } finally {
      setDeleteModal({ isOpen: false, guest: null });
    }
  };

  const handleCloseDeleteModal = () => {
    setDeleteModal({ isOpen: false, guest: null });
  };

  const handleUpdateGuest = async (guestId, guestData) => {
    try {
      await updateGuestMutation.mutateAsync({
        eventId,
        guestId,
        data: guestData,
      });
      setShowEditPopup(false);
      setEditingGuest(null);
    } catch (error) {
      console.error("Error updating guest:", error);
      throw error;
    }
  };

  const handleCloseEditPopup = () => {
    setShowEditPopup(false);
    setEditingGuest(null);
  };

  const handleSendReminder = () => {
    setShowReminderPopup(true);
  };

  const handleCloseReminderPopup = () => {
    setShowReminderPopup(false);
  };

  const handleConfirmReminder = async (message) => {
    try {
      await messagingService.sendReminder(eventId, "sms", "ar", message);
      toast.success(t("reminderPopup.success"));
      setShowReminderPopup(false);
    } catch (error) {
      console.error("Error sending reminder:", error);
      toast.error(t("reminderPopup.error"));
    }
  };

  const handleSendInvitation = () => {
    const guestsWithPhone = guests.filter((g) => g.phone && g.phone !== "-");
    if (guestsWithPhone.length === 0) {
      toast.error(t("messaging.noGuestsWithPhone", "لا يوجد ضيوف لديهم أرقام هواتف"));
      return;
    }
    setSelectedGuests(guestsWithPhone.map((g) => g.id));
    setShowInvitationPopup(true);
  };

  const handleConfirmSendInvitation = async (channel) => {
    if (selectedGuests.length === 0) return;

    setIsSendingInvitation(true);
    try {
      // TODO: Use messaging mutation hook when available
      // For now, this is a placeholder for the messaging service integration
      toast.success(
        t("messaging.invitationsSent", {
          count: selectedGuests.length,
        })
      );
      setShowInvitationPopup(false);
      setSelectedGuests([]);
    } catch (error) {
      console.error("Error sending invitations:", error);
      toast.error(t("messaging.sendError"));
    } finally {
      setIsSendingInvitation(false);
    }
  };

  const handleCloseInvitationPopup = () => {
    setShowInvitationPopup(false);
    setSelectedGuests([]);
  };

  const guestsList = guests || [];

  return (
    <>
      <div className={styles.rightCol}>
        <Table
          title={t("singleEvent.guestTable.title", "قائمة الضيوف")}
          headers={[
            t("table.columns.guestName", "اسم الضيف"),
            t("table.columns.mobile", "رقم الجوال"),
            t("table.columns.email", "البريد الإلكتروني"),
            t("table.columns.addedBy", "أضافه"),
            t("table.columns.status", "الحالة"),
            t("table.columns.sentVia", "أُرسل عبر"),
            t("table.columns.responseTime", "وقت الرد"),
          ]}
          data={guestsList.map((guest) => ({
            id: guest.id,
            name: guest.name || "-",
            phone: guest.phone || "-",
            email: guest.email || "-",
            addedBy: guest.addedBy?.username || guest.addedBy?.name || "-",
            status: guest.status || "invited",
            sentVia: guest.invitation?.effectiveChannel || guest.invitation?.method || null,
            smsFallback: guest.invitation?.smsFallback || false,
            responseTime: guest.rsvp?.respondedAt,
          }))}
          actions={[
            {
              type: "dropdown",
              icon: "/svg/events/edit.svg",
              text: t("table.actions.edit", "تعديل"),
              onClick: (row) => {
                const guest = guestsList.find(
                  (g) => (g.id) === row.id
                );
                if (guest) handleEditGuest(guest);
              },
            },
            {
              type: "dropdown",
              icon: "/svg/events/delete.svg",
              text: t("table.actions.delete", "حذف"),
              onClick: (row) => {
                const guest = guestsList.find(
                  (g) => (g.id) === row.id
                );
                if (guest) handleDeleteGuest(guest);
              },
            },
          ]}
          moreOptions={[
            {
              text: t("messaging.sendInvitations", "إرسال الدعوات"),
              onClick: handleSendInvitation,
            },
            {
              text: t("singleEvent.header.sendReminder", "إرسال تذكير"),
              onClick: handleSendReminder,
            },
          ]}
          renderCell={(key, value, row) => {
            if (key === "sentVia") {
              if (!value) return <span style={{ color: "#9CA3AF" }}>—</span>;
              const isWhatsApp = value === "whatsapp";
              const isFallback = row.smsFallback;
              const badge = isWhatsApp
                ? { bg: "#D1F2EB", color: "#1A7A5E", icon: "📱", label: "واتساب" }
                : { bg: "#FFF3CD", color: "#856404", icon: "💬", label: isFallback ? "SMS (بديل)" : "SMS" };
              return (
                <div
                  style={{
                    display: "inline-flex",
                    gap: "4px",
                    alignItems: "center",
                    padding: "0.25rem 0.9rem",
                    borderRadius: "9999px",
                    background: badge.bg,
                  }}
                >
                  <span style={{ fontSize: "1rem" }}>{badge.icon}</span>
                  <span style={{ color: badge.color, fontFamily: "Cairo", fontSize: "1.1rem" }}>
                    {badge.label}
                  </span>
                </div>
              );
            }
            if (key === "status") {
              const statusConfig = {
                confirmed: {
                  bg: "#EAF4EF",
                  color: "#2A8C5B",
                  text: t("table.status.confirmed", "مؤكد"),
                },
                checked_in: {
                  bg: "#DBEAFE",
                  color: "#1E40AF",
                  text: t("table.status.checkedIn", "حضر"),
                },
                declined: {
                  bg: "#F9EBEA",
                  color: "#C0392B",
                  text: t("table.status.declined", "معتذر"),
                },
                maybe: {
                  bg: "#F8FAFC",
                  color: "#64748B",
                  text: t("table.status.maybe", "ربما"),
                },
                invited: {
                  bg: "#FBF3E6",
                  color: "#D38200",
                  text: t("table.status.invited", "مدعو"),
                },
              };
              const config = statusConfig[value] || statusConfig.invited;
              return (
                <div
                  style={{
                    display: "inline-flex",
                    padding: "0.3rem 1.2rem",
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: "9999px",
                    background: config.bg,
                  }}
                >
                  <span
                    style={{
                      color: config.color,
                      fontFamily: "Cairo",
                      fontSize: "1.2rem",
                    }}
                  >
                    {config.text}
                  </span>
                </div>
              );
            }
            if (key === "responseTime" && value) {
              return formatDate(value);
            }
            return value;
          }}
          showSearch={true}
          showFilter={false}
          showExport={true}
          onExportClick={handleExportGuests}
        />
      </div>

      <PopupWrapper isOpen={showEditPopup} onClose={handleCloseEditPopup}>
        <AddGuestPopup
          onConfirm={handleUpdateGuest}
          onCancel={handleCloseEditPopup}
          eventId={eventId}
          editGuest={editingGuest}
        />
      </PopupWrapper>

      <PopupWrapper
        isOpen={showReminderPopup}
        onClose={handleCloseReminderPopup}
      >
        <ReminderPopup
          numberOfGuests={guestsList.length || 0}
          onConfirm={handleConfirmReminder}
          onCancel={handleCloseReminderPopup}
        />
      </PopupWrapper>

      <PopupWrapper
        isOpen={showInvitationPopup}
        onClose={handleCloseInvitationPopup}
      >
        <SendInvitationPopup
          selectedCount={selectedGuests.length}
          onConfirm={handleConfirmSendInvitation}
          onCancel={handleCloseInvitationPopup}
          isLoading={isSendingInvitation}
        />
      </PopupWrapper>

      <DeleteConfirmation
        isOpen={deleteModal.isOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title={t("singleEvent.guestTable.deleteTitle", "Delete Guest")}
        message={t("singleEvent.guestTable.confirmDelete", "Are you sure you want to delete this guest?")}
        itemName={deleteModal.guest?.name}
        confirmText={t("table.confirmDelete", "Delete")}
        cancelText={t("table.cancelDelete", "Cancel")}
        isLoading={deleteGuestMutation.isPending}
      />
    </>
  );
}
