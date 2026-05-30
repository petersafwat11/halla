import { cookies } from "next/headers";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";
import { requirePageAccess } from "@/services/serverAuth";
import { adminKeys } from "@/hooks/admin/keys";
import initTranslations from "@/localization/i18n";
import ClientComponentsTranslationsProvider from "@/providers/ClientCompTrans";
import WhitelabelsPageHeader from "./_components/WhitelabelsPageHeader";
import WhitelabelsTable from "./_components/WhitelabelsTable";
import WhitelabelStats from "./_components/WhitelabelStats";
import styles from "./page.module.css";

const i18nNamespaces = ["adminWhitelabels", "table"];

export default async function WhitelabelsPage({ params, searchParams }) {
  const { lang } = await params;
  await requirePageAccess("whitelabels", lang);
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
      queryKey: adminKeys.whitelabels(filters),
      path: API_PATHS.admin.whitelabels.getAll,
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
          <WhitelabelsPageHeader />
          <WhitelabelStats />
          <WhitelabelsTable />
        </div>
      </QueryClientServerProvider>
    </ClientComponentsTranslationsProvider>
  );
}
