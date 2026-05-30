import { cookies } from "next/headers";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";
import { requirePageAccess } from "@/services/serverAuth";
import { adminKeys } from "@/hooks/admin/keys";
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
        // Pre-existing literal `["admin","whitelabels","details",id]` didn't
        // match any client hook key. Swapping to `whitelabelDetail(id)` aligns
        // the prefetch with `useAdminWhitelabel` so SSR data is actually used.
        queryKey: adminKeys.whitelabelDetail(id),
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
