"use client";
import React from "react";
import Table from "@/ui/commen/new-table/Table";
import { useTranslation } from "react-i18next";
import { useRouter, useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useMyEvents } from "@/hooks/events";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import ErrorFallback from "@/ui/common/error/ErrorFallback";
import { useLocalizedDate } from "@/utils/date/useLocalizedDate";
import { useEventsTableExport } from "./EventsTableToolbar";
import { useEventsTableActions } from "./EventsTableActions";
import { getStatusVisual } from "@/utils/statusColors";

const EventsTable = () => {
  const { t } = useTranslation("host-events");
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const { formatDate } = useLocalizedDate();

  // React Query hooks
  const { data: eventsData, isLoading, error } = useMyEvents();

  // Backend's sendPaginated returns { status, data: [...], pagination }.
  const events = eventsData?.data || [];

  const { handleExportEvents } = useEventsTableExport(t);
  const { getRowActions, bulkActions, deleteModalElement } = useEventsTableActions({ t });

  // Prefetch event details on hover
  const handleRowHover = (row) => {
    queryClient.prefetchQuery({
      queryKey: ["events", row.id],
      staleTime: 5 * 60 * 1000,
    });
  };

  if (isLoading) {
    return <SimpleLoading message={t("loading")} />;
  }

  if (error) {
    return <ErrorFallback message={t("errors.loadFailed", "Failed to load events")} />;
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
          t("table.columns.maybe", "ربما"),
          t("table.columns.noResponse", "لم يرد"),
          t("table.columns.dateTime", "التاريخ والوقت"),
          t("table.columns.status", "الحالة"),
        ]}
        data={events.map((event) => {
          const guestCount = event.guestCount || 0;
          const confirmed = event.confirmedCount || 0;
          const declined = event.declinedCount || 0;
          const maybe = event.maybeCount || 0;
          const noResponse = Math.max(0, guestCount - confirmed - declined - maybe);
          return {
            id: event.id,
            title: event.title || "-",
            type: event.eventType || "-",
            confirmed,
            declined,
            maybe,
            noResponse,
            dateTime: event.date,
            status: event.status || "pending_scheduling",
          };
        })}
        onRowClick={(row) => {
          const event = events.find((e) => e.id === row.id);
          if (event) router.push(`/${params.lang}/host/events/${event.id}`);
        }}
        onRowHover={handleRowHover}
        renderCell={(key, value, row) => {
          if (key === "status") {
            const statusText = {
              live: t("eventStatus.live", "مباشرة"),
              scheduled: t("eventStatus.scheduled", "مجدولة"),
              pending_scheduling: t("eventStatus.pending_scheduling", "في انتظار الجدولة"),
              completed: t("eventStatus.completed", "منتهية"),
              cancelled: t("eventStatus.cancelled", "ملغية"),
              failed: t("eventStatus.failed", "فشل الإرسال"),
              deleted: t("eventStatus.deleted", "محذوفة"),
            };
            const { fg, bg } = getStatusVisual(value);
            // Unknown status → neutral chip showing the real status, never a
            // misleading "pending scheduling" fallback.
            const text = statusText[value] || t(`eventStatus.${value}`, value || "-");
            return (
              <div
                style={{
                  display: "inline-flex",
                  padding: "0.3rem 1.2rem",
                  justifyContent: "center",
                  alignItems: "center",
                  borderRadius: "9999px",
                  background: bg,
                }}
              >
                <span
                  style={{
                    color: fg,
                    fontFamily: "Cairo",
                    fontSize: "1.2rem",
                  }}
                >
                  {text}
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
          if (key === "maybe") {
            return <strong style={{ color: "#B7791F" }}>{value}</strong>;
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

      {deleteModalElement}
    </>
  );
};

export default EventsTable;
