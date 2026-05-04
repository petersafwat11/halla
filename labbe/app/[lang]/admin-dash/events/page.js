import { cookies } from "next/headers";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { requirePageAccess } from "@/services/serverAuth";
import EventsPageHeader from "./_components/EventsPageHeader";
import EventsTable from "./_components/EventsTable";
import EventStats from "./_components/EventStats";
import styles from "./page.module.css";

export default async function EventsPage({ params, searchParams }) {
  const { lang } = await params;
  await requirePageAccess("events", lang);

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const queryClient = createServerQueryClient();

  const urlParams = await searchParams;
  const filters = {
    page: urlParams?.page || 1,
    limit: urlParams?.limit || 10,
    search: urlParams?.search,
    status: urlParams?.status,
    from: urlParams?.from,
    to: urlParams?.to,
  };

  if (token) {
    await prefetchServerData({
      queryClient,
      queryKey: ["events", "admin", filters],
      path: API_PATHS.events.getAllEvents,
      params: filters,
      token,
    });
  }

  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <div className={styles.container}>
        <EventsPageHeader />
        <EventStats />
        <EventsTable />
      </div>
    </QueryClientServerProvider>
  );
}
