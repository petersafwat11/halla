import { cookies } from "next/headers";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { requirePageAccess } from "@/services/serverAuth";
import initTranslations from "@/localization/i18n";
import ClientComponentsTranslationsProvider from "@/providers/ClientCompTrans";
import WhitelabelDetailsWrapper from "./_components/WhitelabelDetailsWrapper";

const i18nNamespaces = ["adminWhitelabels", "table"];

export default async function WhitelabelDetailsPage({ params }) {
  const { lang, id } = await params;
  await requirePageAccess("whitelabels", lang);
  const { resources } = await initTranslations(lang, i18nNamespaces);

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const queryClient = createServerQueryClient();

  if (token) {
    try {
      await prefetchServerData({
        queryClient,
        queryKey: ["admin", "whitelabels", "details", id],
        path: API_PATHS.admin.whitelabels.getById(id),
        token,
      });
    } catch (error) {
      console.error("Error prefetching whitelabel details:", error);
    }
  }

  return (
    <ClientComponentsTranslationsProvider
      locale={lang}
      namespaces={i18nNamespaces}
      resources={resources}
    >
      <QueryClientServerProvider queryClient={queryClient}>
        <WhitelabelDetailsWrapper whitelabelId={id} />
      </QueryClientServerProvider>
    </ClientComponentsTranslationsProvider>
  );
}
