"use client";
import React, { useState } from "react";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import { useEventMutation } from "@/hooks/events";
import DeleteConfirmation from "@/ui/vendor/modals/DeleteConfirmation";

/**
 * Hook that owns the delete + bulk-delete modal state, optimistic cache
 * updates, row/bulk action descriptors, and the rendered confirmation
 * modal element for the host events table.
 *
 * Returns the JSX element rather than a component so the caller can keep
 * the same render tree as before the split (one fragment with <Table />
 * and the modal as siblings).
 */
export const useEventsTableActions = ({ t }) => {
  const queryClient = useQueryClient();
  const deleteMutation = useEventMutation("deleteEvent");
  const bulkDeleteMutation = useEventMutation("bulkDeleteEvents");

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    eventId: null,
    isBulk: false,
    selectedIds: [],
  });

  const handleDeleteClick = (eventId) => {
    setDeleteModal({
      isOpen: true,
      eventId,
      isBulk: false,
      selectedIds: [],
    });
  };

  const handleBulkDeleteClick = (selectedRowIds) => {
    if (!selectedRowIds || selectedRowIds.length === 0) return;
    setDeleteModal({
      isOpen: true,
      eventId: null,
      isBulk: true,
      selectedIds: selectedRowIds,
    });
  };

  const handleConfirmDelete = async () => {
    if (deleteModal.isBulk) {
      const previousEvents = queryClient.getQueryData(["events", "my-events"]);

      queryClient.setQueryData(["events", "my-events"], (old) => {
        if (!old) return old;
        const oldEvents = Array.isArray(old.data) ? old.data : [];
        const filtered = oldEvents.filter(
          (event) => !deleteModal.selectedIds.includes(event.id)
        );
        return { ...old, data: filtered };
      });

      try {
        await bulkDeleteMutation.mutateAsync(deleteModal.selectedIds);
        toast.success(
          t("table.bulkDeleteSuccess", {
            count: deleteModal.selectedIds.length,
          })
        );
      } catch (error) {
        queryClient.setQueryData(["events", "my-events"], previousEvents);
        toast.error(t("table.bulkDeleteError"));
      }
    } else {
      const previousEvents = queryClient.getQueryData(["events", "my-events"]);

      queryClient.setQueryData(["events", "my-events"], (old) => {
        if (!old) return old;
        const oldEvents = Array.isArray(old.data) ? old.data : [];
        const filtered = oldEvents.filter(
          (event) => event.id !== deleteModal.eventId
        );
        return { ...old, data: filtered };
      });

      try {
        await deleteMutation.mutateAsync(deleteModal.eventId);
        toast.success(t("table.deleteSuccess"));
      } catch (error) {
        queryClient.setQueryData(["events", "my-events"], previousEvents);
        toast.error(t("table.deleteError"));
      }
    }

    setDeleteModal({ isOpen: false, eventId: null, isBulk: false, selectedIds: [] });
  };

  const handleCloseDeleteModal = () => {
    setDeleteModal({ isOpen: false, eventId: null, isBulk: false, selectedIds: [] });
  };

  const getRowActions = (row) => [
    {
      type: "dropdown",
      icon: "/svg/events/trash.svg",
      text: t("table.actions.delete", "حذف"),
      onClick: () => handleDeleteClick(row.id),
      variant: "danger",
    },
  ];

  const bulkActions = [
    {
      icon: "/svg/events/trash.svg",
      text: t("table.actions.deleteSelected", "حذف المحدد"),
      onClick: handleBulkDeleteClick,
      variant: "danger",
    },
  ];

  const deleteModalElement = (
    <DeleteConfirmation
      isOpen={deleteModal.isOpen}
      onClose={handleCloseDeleteModal}
      onConfirm={handleConfirmDelete}
      title={deleteModal.isBulk ? t("table.bulkDeleteTitle") : t("table.deleteTitle")}
      message={
        deleteModal.isBulk ? (
          t("table.bulkDeleteConfirm", { count: deleteModal.selectedIds.length })
        ) : (
          t("table.deleteConfirm")
        )
      }
      confirmText={t("table.confirmDelete")}
      cancelText={t("table.cancelDelete")}
      isLoading={deleteMutation.isPending || bulkDeleteMutation.isPending}
    />
  );

  return {
    getRowActions,
    bulkActions,
    deleteModalElement,
  };
};
