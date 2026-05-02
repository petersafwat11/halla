import { cookies } from "next/headers";
import { requirePageAccess } from "@/services/serverAuth";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import EventDetailsContent from "./_components/EventDetailsContent";
import styles from "./singleEvent.module.css";

export default async function AdminEventDetailsPage({ params }) {
  const { lang, id } = await params;
  await requirePageAccess("events", lang);

  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const queryClient = createServerQueryClient();

  if (token) {
    await prefetchServerData({
      queryClient,
      queryKey: ["admin", "events", id, "stats"],
      path: API_PATHS.events.getSingleEventStats(id),
      token,
    });
  }

  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <div className={styles.page}>
        <EventDetailsContent eventId={id} />
      </div>
    </QueryClientServerProvider>
  );
}
