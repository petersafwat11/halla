"use client";
import React, { useState } from "react";
import Table from "@/ui/commen/new-table/Table";
import { useTranslation } from "react-i18next";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import { useMyEvents, useEventMutation } from "@/hooks/reactQueryHooks/useEvents";
import DeleteConfirmation from "@/ui/vendor/modals/DeleteConfirmation";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import ErrorBoundary from "@/ui/common/error/ErrorBoundary";
import { useLocalizedDate } from "@/utils/date/useLocalizedDate";
import { downloadExportFile } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

const EventsTable = () => {
  const { t } = useTranslation("host-events");
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const { formatDate } = useLocalizedDate();

  // React Query hooks
  const { data: eventsData, isLoading, error } = useMyEvents();
  const deleteMutation = useEventMutation("deleteEvent");
  const bulkDeleteMutation = useEventMutation("bulkDeleteEvents");

  // Extract events from response
  const events = eventsData?.data?.data || eventsData?.data || eventsData || [];

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    eventId: null,
    isBulk: false,
    selectedIds: [],
  });

  // Handle export
  const handleExportEvents = async () => {
    try {
      const result = await downloadExportFile({
        path: API_PATHS.events.exportEventsAsExcel,
        filename: "events.xlsx",
      });

      if (result.success) {
        toast.success(t("table.exportSuccess"));
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error(t("table.exportError"));
    }
  };

  // Open delete modal for single event
  const handleDeleteClick = (eventId) => {
    setDeleteModal({
      isOpen: true,
      eventId,
      isBulk: false,
      selectedIds: [],
    });
  };

  // Open delete modal for bulk delete
  const handleBulkDeleteClick = (selectedRowIds) => {
    if (!selectedRowIds || selectedRowIds.length === 0) return;
    setDeleteModal({
      isOpen: true,
      eventId: null,
      isBulk: true,
      selectedIds: selectedRowIds,
    });
  };

  // Confirm delete with optimistic update
  const handleConfirmDelete = async () => {
    if (deleteModal.isBulk) {
      // Optimistic update for bulk delete
      const previousEvents = queryClient.getQueryData(["events", "my-events"]);

      queryClient.setQueryData(["events", "my-events"], (old) => {
        if (!old) return old;
        const oldEvents = old.data?.data || old.data || old;
        const filtered = Array.isArray(oldEvents)
          ? oldEvents.filter((event) => !deleteModal.selectedIds.includes(event.id))
          : [];
        return {
          ...old,
          data: { ...(old.data || {}), data: filtered },
        };
      });

      try {
        await bulkDeleteMutation.mutateAsync(deleteModal.selectedIds);
        toast.success(
          t("table.bulkDeleteSuccess", {
            count: deleteModal.selectedIds.length,
          })
        );
      } catch (error) {
        // Rollback on error
        queryClient.setQueryData(["events", "my-events"], previousEvents);
        toast.error(t("table.bulkDeleteError"));
      }
    } else {
      // Optimistic update for single delete
      const previousEvents = queryClient.getQueryData(["events", "my-events"]);

      queryClient.setQueryData(["events", "my-events"], (old) => {
        if (!old) return old;
        const oldEvents = old.data?.data || old.data || old;
        const filtered = Array.isArray(oldEvents)
          ? oldEvents.filter((event) => event.id !== deleteModal.eventId)
          : [];
        return {
          ...old,
          data: { ...(old.data || {}), data: filtered },
        };
      });

      try {
        await deleteMutation.mutateAsync(deleteModal.eventId);
        toast.success(t("table.deleteSuccess"));
      } catch (error) {
        // Rollback on error
        queryClient.setQueryData(["events", "my-events"], previousEvents);
        toast.error(t("table.deleteError"));
      }
    }

    setDeleteModal({ isOpen: false, eventId: null, isBulk: false, selectedIds: [] });
  };

  // Close delete modal
  const handleCloseDeleteModal = () => {
    setDeleteModal({ isOpen: false, eventId: null, isBulk: false, selectedIds: [] });
  };

  // Prefetch event details on hover
  const handleRowHover = (row) => {
    queryClient.prefetchQuery({
      queryKey: ["events", row.id],
      staleTime: 5 * 60 * 1000,
    });
  };

  // Row actions for each event
  const getRowActions = (row) => [
    {
      type: "dropdown",
      icon: "/svg/events/trash.svg",
      text: t("table.actions.delete", "حذف"),
      onClick: () => handleDeleteClick(row.id),
      variant: "danger",
    },
  ];

  // Bulk actions - Table passes selectedRows to onClick
  const bulkActions = [
    {
      icon: "/svg/events/trash.svg",
      text: t("table.actions.deleteSelected", "حذف المحدد"),
      onClick: handleBulkDeleteClick,
      variant: "danger",
    },
  ];

  if (isLoading) {
    return <SimpleLoading message={t("loading")} />;
  }

  if (error) {
    return (
      <ErrorBoundary onRetry={() => queryClient.invalidateQueries({ queryKey: ["events"] })}>
        <div />
      </ErrorBoundary>
    );
  }

  return (
    <>
      <Table
        title={t("table.eventsList", "قائمة المناسبات")}
        headers={[
          t("table.columns.eventTitle", "عنوان المناسبة"),
          t("table.columns.eventType", "نوع المناسبة"),
          t("table.columns.confirmed", "مؤكد"),
          t("table.columns.declined", "معتذر"),
          t("table.columns.noResponse", "لم يرد"),
          t("table.columns.dateTime", "التاريخ والوقت"),
          t("table.columns.status", "الحالة"),
        ]}
        data={events.map((event) => {
          const guestCount = event.guestCount || 0;
          const confirmed = event.confirmedCount || 0;
          const declined = event.declinedCount || 0;
          const noResponse = Math.max(0, guestCount - confirmed - declined);
          return {
            id: event.id,
            title: event.title || "-",
            type: event.eventType || "-",
            confirmed,
            declined,
            noResponse,
            dateTime: event.date,
            status: event.status || "draft",
          };
        })}
        onRowClick={(row) => {
          const event = events.find((e) => e.id === row.id);
          if (event) router.push(`/${params.lang}/host/events/${event.id}`);
        }}
        onRowHover={handleRowHover}
        renderCell={(key, value, row) => {
          if (key === "status") {
            const statusConfig = {
              live: {
                bg: "#EAF4EF",
                color: "#2A8C5B",
                text: t("eventStatus.live", "مباشرة"),
              },
              scheduled: {
                bg: "#DBEAFE",
                color: "#1E40AF",
                text: t("eventStatus.scheduled", "مجدولة"),
              },
              draft: {
                bg: "#FBF3E6",
                color: "#D38200",
                text: t("eventStatus.draft", "مسودة"),
              },
              completed: {
                bg: "#E5E7EB",
                color: "#374151",
                text: t("eventStatus.completed", "منتهية"),
              },
              cancelled: {
                bg: "#F9EBEA",
                color: "#C0392B",
                text: t("eventStatus.cancelled", "ملغية"),
              },
            };
            const config = statusConfig[value] || statusConfig.draft;
            return (
              <div
                style={{
                  display: "inline-flex",
                  padding: "0.3rem 1.2rem",
                  justifyContent: "center",
                  alignItems: "center",
                  borderRadius: "9999px",
                  background: config.bg,
                }}
              >
                <span
                  style={{
                    color: config.color,
                    fontFamily: "Cairo",
                    fontSize: "1.2rem",
                  }}
                >
                  {config.text}
                </span>
              </div>
            );
          }
          if (key === "dateTime" && value) {
            return formatDate(value);
          }
          if (key === "confirmed") {
            return <strong style={{ color: "#2A8C5B" }}>{value}</strong>;
          }
          if (key === "declined") {
            return <strong style={{ color: "#C0392B" }}>{value}</strong>;
          }
          if (key === "noResponse") {
            return <strong style={{ color: "#D38200" }}>{value}</strong>;
          }
          return value;
        }}
        showSearch={true}
        showFilter={false}
        showExport={true}
        onExportClick={handleExportEvents}
        getRowActions={getRowActions}
        bulkActions={bulkActions}
        showCheckboxes={true}
      />

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
    </>
  );
};

export default EventsTable;
