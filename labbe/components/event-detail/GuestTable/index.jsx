"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useEvent } from "@/hooks/events";
import { useGuestMutation } from "@/hooks/guests";
import { useEventGuests } from "@/hooks/events/queries/useEventGuests";
import { useLocalizedDate } from "@/utils/date/useLocalizedDate";
import styles from "@/app/[lang]/host/events/[id]/singleEvent.module.css";
import GuestRows from "./GuestRows";
import GuestPopups from "./GuestPopups";
import useGuestTableActions from "./useGuestTableActions";

export default function GuestTable({ eventId }) {
  const { t } = useTranslation("home-events");
  const { formatDate, formatDateTime } = useLocalizedDate();

  const { data: eventData } = useEvent(eventId);
  const { data: guestsData } = useEventGuests(eventId);
  const deleteGuestMutation = useGuestMutation("delete");
  const updateGuestMutation = useGuestMutation("update");

  const event = eventData?.data?.event || null;
  const guests = guestsData?.data || [];

  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showReminderPopup, setShowReminderPopup] = useState(false);
  const [showInvitationPopup, setShowInvitationPopup] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [isSendingInvitation, setIsSendingInvitation] = useState(false);
  const [selectedGuests, setSelectedGuests] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, guest: null });

  const actions = useGuestTableActions({
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
  });

  return (
    <>
      <div className={styles.rightCol}>
        <GuestRows
          guests={guests}
          t={t}
          formatDate={formatDate}
          formatDateTime={formatDateTime}
          onEditGuest={actions.handleEditGuest}
          onDeleteGuest={actions.handleDeleteGuest}
          onSendInvitation={actions.handleSendInvitation}
          onSendReminder={actions.handleSendReminder}
          onExportGuests={actions.handleExportGuests}
        />
      </div>

      <GuestPopups
        eventId={eventId}
        guestsCount={guests.length}
        showEditPopup={showEditPopup}
        showReminderPopup={showReminderPopup}
        showInvitationPopup={showInvitationPopup}
        editingGuest={editingGuest}
        deleteModal={deleteModal}
        selectedGuestsCount={selectedGuests.length}
        isSendingInvitation={isSendingInvitation}
        isDeleting={deleteGuestMutation.isPending}
        onCloseEditPopup={actions.handleCloseEditPopup}
        onUpdateGuest={actions.handleUpdateGuest}
        onCloseReminderPopup={actions.handleCloseReminderPopup}
        onConfirmReminder={actions.handleConfirmReminder}
        onCloseInvitationPopup={actions.handleCloseInvitationPopup}
        onConfirmSendInvitation={actions.handleConfirmSendInvitation}
        onCloseDeleteModal={actions.handleCloseDeleteModal}
        onConfirmDelete={actions.handleConfirmDelete}
        t={t}
      />
    </>
  );
}
