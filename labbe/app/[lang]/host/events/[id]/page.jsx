import { cookies } from "next/headers";
import styles from "./singleEvent.module.css";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import {
  HostEventHeader,
  EventStats,
  GuestTable,
  EventFailureBannerClient,
  AutoReminderInfoText,
  ScheduleReminderSection,
} from "@/components/event-detail";

export default async function SingleEventPage({ params }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const queryClient = createServerQueryClient();

  if (token && id) {
    try {
      // Prefetch single event stats
      await prefetchServerData({
        queryClient,
        queryKey: ["events", id, "stats"],
        path: API_PATHS.events.getSingleEventStats(id),
        token,
      });

      // Prefetch event details
      await prefetchServerData({
        queryClient,
        queryKey: ["events", id],
        path: API_PATHS.events.getEventById(id),
        token,
      });
    } catch (error) {
      console.error("Error prefetching event data:", error);
    }
  }

  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <div className={styles.page}>
        <HostEventHeader eventId={id} />
        <EventFailureBannerClient eventId={id} />
        <AutoReminderInfoText />
        <ScheduleReminderSection eventId={id} />
        <div>
          <div className={styles.statsData}>
            <EventStats eventId={id} />
          </div>
          <div className={styles.guestsTable}>
            <GuestTable eventId={id} />
          </div>
        </div>
      </div>
    </QueryClientServerProvider>
  );
}
