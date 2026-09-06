"use client";
import { toast } from "react-toastify";
import { handleError } from "@/services/errorHandlingService";
import { downloadExportFile } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";

export default function useGuestTableActions({
  t,
  eventId,
  deleteGuestMutation,
  updateGuestMutation,
  rotateGuestMutation,
  revokeAccessMutation,
  deleteModal,
  setDeleteModal,
  setShowEditPopup,
  setEditingGuest,
}) {

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

    try {
      await deleteGuestMutation.mutateAsync({ eventId, guestId });
      toast.success(t("singleEvent.guestTable.deleteSuccess"));
    } catch (error) {
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

  // Rotate a guest's QR/access token — invalidates the old code and issues a
  // fresh one (backend re-delivers it). Parity with the mobile long-press menu.
  const handleRotateQr = async (guest) => {
    if (!guest?.id) {
      toast.error(t("errors.noGuestId", "Guest ID not found"));
      return;
    }
    if (
      !window.confirm(
        t("singleEvent.guestTable.rotateQrConfirm", "تحديث رمز الدخول لهذا الضيف؟")
      )
    )
      return;
    try {
      await rotateGuestMutation.mutateAsync({ eventId, guestId: guest.id });
      toast.success(
        t("singleEvent.guestTable.rotateQrSuccess", "تم تحديث رمز الدخول")
      );
    } catch (error) {
      handleError(error, t, {
        fallbackMessage: "singleEvent.guestTable.rotateQrError",
      });
    }
  };

  // Revoke a guest's access to post-event content (idempotent on the backend).
  const handleRevokeAccess = async (guest) => {
    if (!guest?.id) {
      toast.error(t("errors.noGuestId", "Guest ID not found"));
      return;
    }
    if (
      !window.confirm(
        t(
          "singleEvent.guestTable.revokeAccessConfirm",
          "إلغاء صلاحية وصول هذا الضيف لمحتوى ما بعد المناسبة؟"
        )
      )
    )
      return;
    try {
      await revokeAccessMutation.mutateAsync({ eventId, guestId: guest.id });
      toast.success(
        t("singleEvent.guestTable.revokeAccessSuccess", "تم إلغاء صلاحية الوصول")
      );
    } catch (error) {
      handleError(error, t, {
        fallbackMessage: "singleEvent.guestTable.revokeAccessError",
      });
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
    handleRotateQr,
    handleRevokeAccess,
  };
}
