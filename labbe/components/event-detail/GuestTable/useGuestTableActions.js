"use client";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import { handleError } from "@/services/errorHandlingService";
import { downloadExportFile } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";
import { useSendReminder } from "@/hooks/messaging";

export default function useGuestTableActions({
  t,
  eventId,
  guests,
  deleteGuestMutation,
  updateGuestMutation,
  deleteModal,
  setDeleteModal,
  setShowEditPopup,
  setEditingGuest,
  setShowReminderPopup,
  setShowInvitationPopup,
  setIsSendingInvitation,
  selectedGuests,
  setSelectedGuests,
}) {
  const queryClient = useQueryClient();
  const sendReminderMutation = useSendReminder();

  const handleExportGuests = async () => {
    try {
      const result = await downloadExportFile({
        path: API_PATHS.guests.exportGuests(eventId),
        filename: `guests-event-${eventId}.xlsx`,
      });
      if (result.success) {
        toast.success(t("singleEvent.guestTable.exportSuccess"));
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      handleError(error, t, {
        fallbackMessage: "singleEvent.guestTable.exportError",
      });
    }
  };

  const handleEditGuest = (guest) => {
    setEditingGuest(guest);
    setShowEditPopup(true);
  };

  const handleDeleteGuest = (guest, e) => {
    if (e) e.stopPropagation();
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
      return {
        ...old,
        data: (old.data || []).filter((g) => g.id !== guestId),
      };
    });

    try {
      await deleteGuestMutation.mutateAsync({ eventId, guestId });
      toast.success(t("singleEvent.guestTable.deleteSuccess"));
    } catch (error) {
      queryClient.setQueryData(["guests", "events", eventId], previousGuests);
      handleError(error, t, {
        fallbackMessage: "singleEvent.guestTable.deleteError",
      });
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
      handleError(error, t, {
        fallbackMessage: "singleEvent.updateGuest.error",
      });
      throw error;
    }
  };

  const handleCloseEditPopup = () => {
    setShowEditPopup(false);
    setEditingGuest(null);
  };

  const handleSendReminder = () => setShowReminderPopup(true);
  const handleCloseReminderPopup = () => setShowReminderPopup(false);

  const handleConfirmReminder = async (message) => {
    try {
      await sendReminderMutation.mutateAsync({
        eventId,
        channel: "sms",
        customMessage: message,
      });
      toast.success(t("reminderPopup.success"));
      setShowReminderPopup(false);
    } catch (error) {
      handleError(error, t, { fallbackMessage: "reminderPopup.error" });
    }
  };

  const handleSendInvitation = () => {
    const guestsWithPhone = guests.filter((g) => g.phone && g.phone !== "-");
    if (guestsWithPhone.length === 0) {
      toast.error(
        t("messaging.noGuestsWithPhone", "لا يوجد ضيوف لديهم أرقام هواتف")
      );
      return;
    }
    setSelectedGuests(guestsWithPhone.map((g) => g.id));
    setShowInvitationPopup(true);
  };

  const handleConfirmSendInvitation = async () => {
    if (selectedGuests.length === 0) return;
    setIsSendingInvitation(true);
    try {
      toast.success(
        t("messaging.invitationsSent", { count: selectedGuests.length })
      );
      setShowInvitationPopup(false);
      setSelectedGuests([]);
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
    handleExportGuests,
    handleEditGuest,
    handleDeleteGuest,
    handleConfirmDelete,
    handleCloseDeleteModal,
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
