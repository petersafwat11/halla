"use client";
import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
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
  noResponse: ["invited", "pending"],
  checkedIn: ["checked_in"],
};

export default function GuestTable({ eventId, statusFilter, onStatusFilterChange }) {
  const { t } = useTranslation("home-events");
  const { formatDate, formatDateTime } = useLocalizedDate();

  const { data: guestsData } = useEventGuests(eventId);
  const deleteGuestMutation = useGuestMutation("delete");
  const updateGuestMutation = useGuestMutation("update");
  const rotateGuestMutation = useGuestMutation("rotateQr");
  const revokeAccessMutation = useGuestMutation("revokeAccess");

  const guests = guestsData?.data || [];

  const filteredGuests = useMemo(() => {
    if (!statusFilter || statusFilter === "totalGuests") return guests;
    const matchStatuses = STATUS_FILTER_MAP[statusFilter];
    if (!matchStatuses) return guests;
    return guests.filter((g) =>
      matchStatuses.includes(g.status || "invited")
    );
  }, [guests, statusFilter]);

  const [showEditPopup, setShowEditPopup] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, guest: null });

  const actions = useGuestTableActions({
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
          onExportGuests={actions.handleExportGuests}
        />
      </div>

      <GuestPopups
        eventId={eventId}
        showEditPopup={showEditPopup}
        editingGuest={editingGuest}
        deleteModal={deleteModal}
        isDeleting={deleteGuestMutation.isPending}
        onCloseEditPopup={actions.handleCloseEditPopup}
        onUpdateGuest={actions.handleUpdateGuest}
        onCloseDeleteModal={actions.handleCloseDeleteModal}
        onConfirmDelete={actions.handleConfirmDelete}
        t={t}
      />
    </>
  );
}
