"use client";
import React from "react";
import PopupWrapper from "@/ui/host/popups/popupWrapper/PopupWrapper";
import AddGuestPopup from "@/ui/host/popups/addGuestPopup/AddGuestPopup";
import ReminderPopup from "@/ui/host/popups/reminderPopup/ReminderPopup";
import SendInvitationPopup from "@/ui/host/popups/sendInvitationPopup/SendInvitationPopup";
import DeleteConfirmation from "@/ui/vendor/modals/DeleteConfirmation";

export default function GuestPopups({
  eventId,
  guestsCount,
  showEditPopup,
  showReminderPopup,
  showInvitationPopup,
  editingGuest,
  deleteModal,
  selectedGuestsCount,
  isSendingInvitation,
  isDeleting,
  onCloseEditPopup,
  onUpdateGuest,
  onCloseReminderPopup,
  onConfirmReminder,
  onCloseInvitationPopup,
  onConfirmSendInvitation,
  onCloseDeleteModal,
  onConfirmDelete,
  t,
}) {
  return (
    <>
      <PopupWrapper isOpen={showEditPopup} onClose={onCloseEditPopup}>
        <AddGuestPopup
          onConfirm={onUpdateGuest}
          onCancel={onCloseEditPopup}
          eventId={eventId}
          editGuest={editingGuest}
        />
      </PopupWrapper>

      <PopupWrapper isOpen={showReminderPopup} onClose={onCloseReminderPopup}>
        <ReminderPopup
          numberOfGuests={guestsCount}
          onConfirm={onConfirmReminder}
          onCancel={onCloseReminderPopup}
        />
      </PopupWrapper>

      <PopupWrapper
        isOpen={showInvitationPopup}
        onClose={onCloseInvitationPopup}
      >
        <SendInvitationPopup
          selectedCount={selectedGuestsCount}
          onConfirm={onConfirmSendInvitation}
          onCancel={onCloseInvitationPopup}
          isLoading={isSendingInvitation}
        />
      </PopupWrapper>

      <DeleteConfirmation
        isOpen={deleteModal.isOpen}
        onClose={onCloseDeleteModal}
        onConfirm={onConfirmDelete}
        title={t("singleEvent.guestTable.deleteTitle", "Delete Guest")}
        message={t(
          "singleEvent.guestTable.confirmDelete",
          "Are you sure you want to delete this guest?"
        )}
        itemName={deleteModal.guest?.name}
        confirmText={t("table.confirmDelete", "Delete")}
        cancelText={t("table.cancelDelete", "Cancel")}
        isLoading={isDeleting}
      />
    </>
  );
}
