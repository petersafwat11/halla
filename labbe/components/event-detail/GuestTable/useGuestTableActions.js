"use client";
import { useState } from "react";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import { handleError } from "@/services/errorHandlingService";
import { downloadExportFile } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";
import { useSendReminder } from "@/hooks/messaging";
import { useResendInvite, useExtraReminder } from "@/hooks/events";

// Audience the resend action targets: guests who haven't responded or said
// "maybe". The combined `noResponseOrMaybe` table filter maps to the same set.
const RESEND_STATUSES = ["invited", "pending", "maybe"];
// Extra reminder targets CONFIRMED guests only (matches the backend, which
// uses the approved `reminder_confirmed` template). `checked_in` guests have
// already arrived, so they're excluded.
const EXTRA_REMINDER_STATUSES = ["confirmed"];

export default function useGuestTableActions({
  t,
  eventId,
  guests,
  invitesRemaining,
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
  const resendInviteMutation = useResendInvite();
  const extraReminderMutation = useExtraReminder();

  // Bulk-action confirmation modal state. We snapshot the resolved guestIds
  // here because the shared Table clears its own selection immediately after
  // firing the bulk action — the modal can't re-read it later.
  const [bulkModal, setBulkModal] = useState({
    isOpen: false,
    type: null, // "resend" | "extraReminder"
    guestIds: [],
  });

  const closeBulkModal = () =>
    setBulkModal({ isOpen: false, type: null, guestIds: [] });

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

  // ── Bulk pool-charged actions ───────────────────────────────────────────
  // Re-filter the selected ids to the right audience for each action so the
  // host can "select all" after filtering and we still only charge for the
  // eligible guests.
  const resolveBulkGuestIds = (selectedIds, allowedStatuses) => {
    const idSet = new Set((selectedIds || []).map((id) => String(id)));
    return guests
      .filter(
        (g) =>
          idSet.has(String(g.id)) &&
          allowedStatuses.includes(g.status || "invited")
      )
      .map((g) => g.id);
  };

  const handleBulkResend = (selectedIds) => {
    const guestIds = resolveBulkGuestIds(selectedIds, RESEND_STATUSES);
    if (guestIds.length === 0) {
      toast.error(
        t(
          "singleEvent.bulkActions.noEligibleResend",
          "None of the selected guests can be re-invited (only non-responders or maybe)."
        )
      );
      return;
    }
    setBulkModal({ isOpen: true, type: "resend", guestIds });
  };

  const handleBulkExtraReminder = (selectedIds) => {
    const guestIds = resolveBulkGuestIds(selectedIds, EXTRA_REMINDER_STATUSES);
    if (guestIds.length === 0) {
      toast.error(
        t(
          "singleEvent.bulkActions.noEligibleReminder",
          "None of the selected guests are confirmed."
        )
      );
      return;
    }
    setBulkModal({ isOpen: true, type: "extraReminder", guestIds });
  };

  const handleConfirmBulkAction = async () => {
    const { type, guestIds } = bulkModal;
    if (!guestIds || guestIds.length === 0) return;
    const mutation =
      type === "resend" ? resendInviteMutation : extraReminderMutation;
    try {
      const result = await mutation.mutateAsync({ eventId, guestIds });
      const data = result?.data || result || {};
      const total = data.reminded ?? guestIds.length;

      // Nothing was sent. The backend filters resend to guests who were already
      // sent an invitation (`invitation.sent: true`), so a host who never sent
      // the initial invites lands here even though the status filter matched.
      // Surface *why* instead of a misleading "0/0 sent" success toast.
      if (total === 0) {
        if (data.code === "SEND_INVITES_FIRST") {
          toast.error(
            t(
              "singleEvent.bulkActions.sendInvitesFirst",
              "Send the initial invitations first, then use resend for guests who haven't responded or chose maybe."
            )
          );
        } else {
          toast.info(
            t(
              type === "resend"
                ? "singleEvent.bulkActions.noEligibleNow"
                : "singleEvent.bulkActions.noConfirmedNow",
              type === "resend"
                ? "Everyone has already responded — no one left to re-invite."
                : "No confirmed guests to remind yet."
            )
          );
        }
        closeBulkModal();
        return;
      }

      const successful = data.successful ?? guestIds.length;
      toast.success(
        t("singleEvent.bulkActions.sentResult", {
          defaultValue: "{{successful}}/{{total}} sent",
          successful,
          total,
        })
      );
      closeBulkModal();
    } catch (error) {
      const code = error?.response?.data?.code;
      if (code === "INSUFFICIENT_INVITES") {
        toast.error(
          t(
            "singleEvent.bulkActions.insufficientInvites",
            "Not enough invites — buy more in Plans."
          )
        );
      } else if (code === "NO_REMINDER_TEMPLATE") {
        toast.error(
          t(
            "singleEvent.bulkActions.noReminderTemplate",
            "No reminder template is configured for this category. Contact support."
          )
        );
      } else {
        handleError(error, t, {
          fallbackMessage: "singleEvent.bulkActions.error",
        });
      }
    }
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
    // Bulk actions
    handleBulkResend,
    handleBulkExtraReminder,
    handleConfirmBulkAction,
    closeBulkModal,
    bulkModal,
    invitesRemaining,
    isBulkPending:
      resendInviteMutation.isPending || extraReminderMutation.isPending,
  };
}
