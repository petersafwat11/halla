"use client";
import React from "react";
import PopupWrapper from "@/ui/host/popups/popupWrapper/PopupWrapper";
import AddGuestPopup from "@/ui/host/popups/addGuestPopup/AddGuestPopup";
import ReminderPopup from "@/ui/host/popups/reminderPopup/ReminderPopup";
import SendInvitationPopup from "@/ui/host/popups/sendInvitationPopup/SendInvitationPopup";

export default function AdminGuestTablePopups({
  eventId,
  guestsCount,
  showEditPopup,
  showReminderPopup,
  showInvitationPopup,
  editingGuest,
  selectedGuestsCount,
  isSendingInvitation,
  onCloseEditPopup,
  onUpdateGuest,
  onCloseReminderPopup,
  onConfirmReminder,
  onCloseInvitationPopup,
  onConfirmSendInvitation,
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

      <PopupWrapper
        isOpen={showReminderPopup}
        onClose={onCloseReminderPopup}
      >
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
    </>
  );
}
