import { cookies } from "next/headers";
import { requirePageAccess } from "@/services/serverAuth";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import initTranslations from "@/localization/i18n";
import ClientComponentsTranslationsProvider from "@/providers/ClientCompTrans";
import EventDetailsContent from "./_components/EventDetailsContent";
import styles from "./singleEvent.module.css";

const i18nNamespaces = ["adminEvents", "adminDashboard", "home-events"];

export default async function AdminEventDetailsPage({ params }) {
  const { lang, id } = await params;
  await requirePageAccess("events", lang);
  const { resources } = await initTranslations(lang, i18nNamespaces);

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const queryClient = createServerQueryClient();

  if (token && id) {
    try {
      await prefetchServerData({
        queryClient,
        queryKey: ["events", id, "stats"],
        path: API_PATHS.events.getSingleEventStats(id),
        token,
      });
    } catch (error) {
      console.error("Error prefetching admin event data:", error);
    }
  }

  return (
    <ClientComponentsTranslationsProvider
      locale={lang}
      namespaces={i18nNamespaces}
      resources={resources}
    >
      <QueryClientServerProvider queryClient={queryClient}>
        <div className={styles.page}>
          <EventDetailsContent eventId={id} />
        </div>
      </QueryClientServerProvider>
    </ClientComponentsTranslationsProvider>
  );
}
