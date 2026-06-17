"use client";
import { useState, useRef, useCallback } from "react";
import { useSingleEventStats } from "@/hooks/events";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import {
  AdminEventHeader,
  EventStats,
  GuestTable,
  SubscriptionInfo,
  AutoReminderInfoText,
  ScheduleReminderSection,
} from "@/components/event-detail";
import styles from "./EventDetailsContent.module.css";

export default function EventDetailsContent({ eventId }) {
  const router = useRouter();
  const { t } = useTranslation("adminEvents");
  const { data, isLoading, error } = useSingleEventStats(eventId);

  const [statusFilter, setStatusFilter] = useState(null);
  const tableRef = useRef(null);

  const handleFilterPress = useCallback((filterKey) => {
    setStatusFilter((prev) => (prev === filterKey ? null : filterKey));
    if (tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  if (isLoading) {
    return <SimpleLoading />;
  }

  if (error) {
    return (
      <div className={styles.error}>
        <h2>{t("errors.loadingEvent", "Error Loading Event")}</h2>
        <p>{error.message}</p>
        <button onClick={() => router.back()}>{t("buttons.goBack", "Go Back")}</button>
      </div>
    );
  }

  const eventData = data?.data || data;
  const guests = eventData?.guests || [];

  return (
    <>
      <AdminEventHeader data={eventData} />

      <div className={styles.contentWrapper}>
        {eventData?.subscription && (
          <SubscriptionInfo subscription={eventData.subscription} />
        )}

        <AutoReminderInfoText eventId={eventId} />
        <ScheduleReminderSection eventId={eventId} />

        <EventStats
          eventId={eventId}
          activeFilter={statusFilter}
          onFilterPress={handleFilterPress}
        />

        <div
          className={styles.membersData}
          ref={tableRef}
          style={{ scrollMarginTop: "24px" }}
        >
          {/* Shared GuestTable fetches via useEventGuests internally —
              the `guests` from useSingleEventStats are still loaded by
              the screen but not threaded through; the cache key match
              keeps the second request hot. */}
          <GuestTable eventId={eventId} statusFilter={statusFilter} onStatusFilterChange={handleFilterPress} />
        </div>
      </div>
    </>
  );
}
