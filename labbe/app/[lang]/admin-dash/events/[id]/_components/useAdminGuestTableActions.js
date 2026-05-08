"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import { cookieUtils } from "@/utils/cookieUtils";
import { eventsAPI } from "@/services/adminDashboard";
import messagingService from "@/services/messaging";

export default function useAdminGuestTableActions({ guests, t }) {
  const router = useRouter();
  const { id: eventId, lang } = useParams();

  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showReminderPopup, setShowReminderPopup] = useState(false);
  const [showInvitationPopup, setShowInvitationPopup] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSendingInvitation, setIsSendingInvitation] = useState(false);
  const [selectedGuests, setSelectedGuests] = useState([]);

  const handleExportGuests = async () => {
    try {
      const token = cookieUtils.getCookie("token");
      await eventsAPI.exportGuests(eventId, token);
      toastUtils.success(
        t(
          "singleEvent.guestTable.exportSuccess",
          "Guests exported successfully"
        )
      );
    } catch (error) {
      handleError(error, t, { fallbackMessage: "singleEvent.guestTable.exportError" });
    }
  };

  const handleEditGuest = (guest) => {
    setEditingGuest(guest);
    setShowEditPopup(true);
  };

  const handleDeleteGuest = async (guest, e) => {
    if (e) {
      e.stopPropagation();
    }

    if (!guest.guestId && !guest._id) {
      toastUtils.error(t("errors.noGuestId", "Guest ID not found"));
      return;
    }

    if (
      !window.confirm(
        t(
          "singleEvent.guestTable.confirmDelete",
          "Are you sure you want to delete this guest?"
        )
      )
    ) {
      return;
    }

    setIsDeleting(true);

    try {
      const token = cookieUtils.getCookie("token");
      const guestId = guest.guestId || guest._id;
      await eventsAPI.deleteGuest(eventId, guestId, token);

      toastUtils.success(
        t("singleEvent.guestTable.deleteSuccess", "Guest deleted successfully")
      );
      router.refresh();
    } catch (error) {
      handleError(error, t, { fallbackMessage: "singleEvent.guestTable.deleteError" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateGuest = async (guestId, guestData) => {
    try {
      const token = cookieUtils.getCookie("token");
      await eventsAPI.updateGuest(eventId, guestId, guestData, token);
      setShowEditPopup(false);
      setEditingGuest(null);
      toastUtils.success(
        t("singleEvent.guestTable.updateSuccess", "Guest updated successfully")
      );
      router.refresh();
    } catch (error) {
      handleError(error, t, { fallbackMessage: "singleEvent.guestTable.updateError" });
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
      await messagingService.sendReminder(eventId, "sms", lang || "ar", message);
      toastUtils.success(t("reminderPopup.success", "Reminder sent successfully"));
      setShowReminderPopup(false);
    } catch (error) {
      handleError(error, t, { fallbackMessage: "reminderPopup.error" });
    }
  };

  const handleSendInvitation = () => {
    const guestsWithPhone = guests.filter((g) => g.phone && g.phone !== "-");
    if (guestsWithPhone.length === 0) {
      toastUtils.error(t("messaging.noGuestsWithPhone", "لا يوجد ضيوف لديهم أرقام هواتف"));
      return;
    }
    setSelectedGuests(guestsWithPhone.map((g) => g.guestId || g._id));
    setShowInvitationPopup(true);
  };

  const handleConfirmSendInvitation = async (channel) => {
    if (selectedGuests.length === 0) return;

    setIsSendingInvitation(true);
    try {
      const result = await messagingService.sendBulkInvitations(
        selectedGuests,
        eventId,
        channel,
        lang || "ar"
      );

      if (result.status === "success") {
        toastUtils.success(
          t("messaging.invitationsSent", {
            count: result.data?.successful || selectedGuests.length,
          }) || `تم إرسال ${result.data?.successful || selectedGuests.length} دعوة بنجاح`
        );
      }
      setShowInvitationPopup(false);
      setSelectedGuests([]);
      router.refresh();
    } catch (error) {
      handleError(error, t, { fallbackMessage: "messaging.sendError" });
    } finally {
      setIsSendingInvitation(false);
    }
  };

  const handleCloseInvitationPopup = () => {
    setShowInvitationPopup(false);
    setSelectedGuests([]);
  };

  return {
    eventId,
    showEditPopup,
    showReminderPopup,
    showInvitationPopup,
    editingGuest,
    isDeleting,
    isSendingInvitation,
    selectedGuests,
    handleExportGuests,
    handleEditGuest,
    handleDeleteGuest,
    handleUpdateGuest,
    handleCloseEditPopup,
    handleSendReminder,
    handleCloseReminderPopup,
    handleConfirmReminder,
    handleSendInvitation,
    handleConfirmSendInvitation,
    handleCloseInvitationPopup,
  };
}
