import { cookies } from "next/headers";
import {
  createServerQueryClient,
  prefetchServerData,
  QueryClientServerProvider,
} from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { requirePageAccess } from "@/services/serverAuth";
import UpdateEventWizard from "../../host/update-event/_components/UpdateEventWizard";
import styles from "./page.module.css";

/**
 * Admin update-event route. Phase 4b W1-UNIFY: this page used to ship a
 * 392-line duplicate (`_components/UpdateEventContent.jsx`). The
 * duplicate has been deleted; this route now thin-wraps the unified
 * `UpdateEventWizard` exported from the host route per D2 / D11. Same
 * wizard, same per-step PATCH dispatch, role-aware branches inside.
 *
 * The whitelabel-admin / whitelabel-moderator users currently navigate
 * here too (their admin surface lives under `/admin-dash/`); when their
 * own route space ships, that page can re-use the same wrapper.
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
        queryKey: ["events", "by-id", eventId],
        path: API_PATHS.events.getEventById(eventId),
        token,
      });
      await prefetchServerData({
        queryClient,
        queryKey: ["events", "subscription-info"],
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
