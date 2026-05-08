"use client";
import React from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useEventGuests } from "@/hooks/events/queries/useEventGuests";
import styles from "../../singleEvent.module.css";
import AdminGuestRows from "./AdminGuestRows";
import AdminGuestPopups from "./AdminGuestPopups";
import useAdminGuestActions from "./useAdminGuestActions";

export default function AdminGuestTable() {
  const { t, i18n } = useTranslation("adminEvents");
  const isArabic = i18n.language === "ar";
  const { id: eventId } = useParams();

  const { data: guestsData } = useEventGuests(eventId);
  const guests = guestsData?.data || [];

  const {
    eventId,
    showEditPopup,
    showReminderPopup,
    showInvitationPopup,
    editingGuest,
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
  } = useAdminGuestActions({ guests, t });

  return (
    <>
      <div className={styles.rightCol}>
        <AdminGuestRows
          guests={guests}
          t={t}
          isArabic={isArabic}
          onEditGuest={handleEditGuest}
          onDeleteGuest={handleDeleteGuest}
          onSendInvitation={handleSendInvitation}
          onSendReminder={handleSendReminder}
          onExportGuests={handleExportGuests}
        />
      </div>

      <AdminGuestPopups
        eventId={eventId}
        guestsCount={guests.length}
        showEditPopup={showEditPopup}
        showReminderPopup={showReminderPopup}
        showInvitationPopup={showInvitationPopup}
        editingGuest={editingGuest}
        selectedGuestsCount={selectedGuests.length}
        isSendingInvitation={isSendingInvitation}
        onCloseEditPopup={handleCloseEditPopup}
        onUpdateGuest={handleUpdateGuest}
        onCloseReminderPopup={handleCloseReminderPopup}
        onConfirmReminder={handleConfirmReminder}
        onCloseInvitationPopup={handleCloseInvitationPopup}
        onConfirmSendInvitation={handleConfirmSendInvitation}
      />
    </>
  );
}
