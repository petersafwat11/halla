import { cookies } from "next/headers";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { requirePageAccess } from "@/services/serverAuth";
import AdminPageHeader from "../_components/AdminPageHeader";
import WhitelabelsTable from "./_components/WhitelabelsTable";
import WhitelabelStats from "./_components/WhitelabelStats";
import styles from "./page.module.css";

export default async function WhitelabelsPage({ params, searchParams }) {
  const { lang } = await params;
  await requirePageAccess("whitelabels", lang);

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
      queryKey: ["admin", "whitelabels", filters],
      path: API_PATHS.admin.whitelabels.getAll,
      params: filters,
      token,
    });
  }

  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <div className={styles.container}>
        <AdminPageHeader
          title="إدارة الوايت ليبل"
          subtitle="عرض وإدارة تطبيقات الوايت ليبل"
        />
        <WhitelabelStats />
        <WhitelabelsTable />
      </div>
    </QueryClientServerProvider>
  );
}
