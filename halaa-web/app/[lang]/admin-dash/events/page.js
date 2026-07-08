import { cookies } from "next/headers";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";
import { requirePageAccess } from "@/services/serverAuth";
import initTranslations from "@/localization/i18n";
import ClientComponentsTranslationsProvider from "@/providers/ClientCompTrans";
import EventsPageHeader from "./_components/EventsPageHeader";
import EventsTable from "./_components/EventsTable";
import EventStats from "./_components/EventStats";
import styles from "./page.module.css";

const i18nNamespaces = ["adminEvents", "adminDashboard"];

export default async function EventsPage({ params, searchParams }) {
  const { lang } = await params;
  await requirePageAccess("events", lang);
  const { resources } = await initTranslations(lang, i18nNamespaces);

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
    <ClientComponentsTranslationsProvider
      locale={lang}
      namespaces={i18nNamespaces}
      resources={resources}
    >
      <QueryClientServerProvider queryClient={queryClient}>
        <div className={styles.container}>
          <EventsPageHeader />
          <EventStats />
          <EventsTable />
        </div>
      </QueryClientServerProvider>
    </ClientComponentsTranslationsProvider>
  );
}
