import { cookies } from "next/headers";
import { requirePageAccess } from "@/services/serverAuth";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import initTranslations from "@/localization/i18n";
import ClientComponentsTranslationsProvider from "@/providers/ClientCompTrans";
import WhitelabelDetailsContent from "./_components/WhitelabelDetailsContent";
import styles from "./page.module.css";

const i18nNamespaces = ["adminWhitelabels", "table"];

export default async function AdminWhitelabelDetailsPage({ params }) {
  const { lang, id } = await params;
  await requirePageAccess("whitelabels", lang);
  const { resources } = await initTranslations(lang, i18nNamespaces);

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const queryClient = createServerQueryClient();

  if (token) {
    await prefetchServerData({
      queryClient,
      queryKey: ["admin", "whitelabels", id],
      path: API_PATHS.admin.whitelabels.getById(id),
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
          <WhitelabelDetailsContent whitelabelId={id} />
        </div>
      </QueryClientServerProvider>
    </ClientComponentsTranslationsProvider>
  );
}
