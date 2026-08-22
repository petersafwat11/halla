import { cookies } from "next/headers";
import {
  createServerQueryClient,
  prefetchServerData,
  QueryClientServerProvider,
} from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";
import { eventsKeys } from "@/hooks/events/keys";
import { requirePageAccess } from "@/services/serverAuth";
import UpdateEventWizard from "../../host/update-event/_components/UpdateEventWizard";
import styles from "./page.module.css";

/**
 * Admin update-event route — thin wrapper around the shared UpdateEventWizard.
 * Same wizard, same per-step PATCH dispatch, role-aware branches inside.
 */
export default async function AdminUpdateEventPage({ params, searchParams }) {
  const resolvedParams = await params;
  const { lang } = resolvedParams;
  await requirePageAccess("events", lang);

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const queryClient = createServerQueryClient();

  const urlParams = await searchParams;
  const eventId = urlParams?.id;

  if (token && eventId) {
    try {
      await prefetchServerData({
        queryClient,
        queryKey: eventsKeys.detail(eventId),
        path: API_PATHS.events.getEventById(eventId),
        token,
      });
      await prefetchServerData({
        queryClient,
        queryKey: eventsKeys.capabilities(eventId),
        path: API_PATHS.events.capabilities(eventId),
        token,
      });
      await prefetchServerData({
        queryClient,
        queryKey: eventsKeys.subscriptionInfo(),
        path: API_PATHS.events.getSubscriptionInfo,
        token,
      });
    } catch (error) {
      console.error("Error prefetching update-event data:", error);
    }
  }

  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <div className={styles.container}>
        <UpdateEventWizard returnPath="admin-dash/events" />
      </div>
    </QueryClientServerProvider>
  );
}
