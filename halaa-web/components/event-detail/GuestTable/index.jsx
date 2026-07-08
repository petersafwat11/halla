"use client";
import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useEvent } from "@/hooks/events";
import { useGuestMutation } from "@/hooks/guests";
import { useEventGuests } from "@/hooks/events/queries/useEventGuests";
import { useLocalizedDate } from "@/utils/date/useLocalizedDate";
import styles from "@/app/[lang]/host/events/[id]/singleEvent.module.css";
import GuestRows from "./GuestRows";
import GuestPopups from "./GuestPopups";
import useGuestTableActions from "./useGuestTableActions";

const STATUS_FILTER_MAP = {
  confirmed: ["confirmed", "checked_in"],
  declined: ["declined"],
  maybe: ["maybe"],
  noResponse: ["invited", "pending"],
  // Combined audience for a one-shot "filter → select-all → resend" flow.
  noResponseOrMaybe: ["invited", "pending", "maybe"],
  checkedIn: ["checked_in"],
};

export default function GuestTable({ eventId, statusFilter, onStatusFilterChange }) {
  const { t } = useTranslation("home-events");
  const { formatDate, formatDateTime } = useLocalizedDate();

  const { data: eventData } = useEvent(eventId);
  const { data: guestsData } = useEventGuests(eventId);
  const deleteGuestMutation = useGuestMutation("delete");
  const updateGuestMutation = useGuestMutation("update");
  const rotateGuestMutation = useGuestMutation("rotateQr");
  const revokeAccessMutation = useGuestMutation("revokeAccess");

  const event = eventData?.data?.event || null;
  const guests = guestsData?.data || [];
  // Remaining invites in the host's pool (real number for per-event plans
  // too; `null` = truly unlimited). Drives the bulk-action cost/disable logic.
  const invitesRemaining = event?.subscription?.invitesRemaining ?? null;

  const filteredGuests = useMemo(() => {
    if (!statusFilter || statusFilter === "totalGuests") return guests;
    const matchStatuses = STATUS_FILTER_MAP[statusFilter];
    if (!matchStatuses) return guests;
    return guests.filter((g) =>
      matchStatuses.includes(g.status || "invited")
    );
  }, [guests, statusFilter]);

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
    invitesRemaining,
    deleteGuestMutation,
    updateGuestMutation,
    rotateGuestMutation,
    revokeAccessMutation,
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
          guests={filteredGuests}
          t={t}
          formatDate={formatDate}
          formatDateTime={formatDateTime}
          statusFilter={statusFilter}
          onStatusFilterChange={onStatusFilterChange}
          onEditGuest={actions.handleEditGuest}
          onDeleteGuest={actions.handleDeleteGuest}
          onRotateQr={actions.handleRotateQr}
          onRevokeAccess={actions.handleRevokeAccess}
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
