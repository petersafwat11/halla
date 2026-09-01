"use client";
import React from "react";
import PopupWrapper from "@/ui/host/popups/popupWrapper/PopupWrapper";
import AddGuestPopup from "@/ui/host/popups/addGuestPopup/AddGuestPopup";
import DeleteConfirmation from "@/ui/vendor/modals/DeleteConfirmation";

export default function GuestPopups({
  eventId,
  showEditPopup,
  editingGuest,
  deleteModal,
  isDeleting,
  onCloseEditPopup,
  onUpdateGuest,
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
