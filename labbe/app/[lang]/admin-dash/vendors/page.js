import { cookies } from "next/headers";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { requirePageAccess } from "@/services/serverAuth";
import VendorsPageHeader from "./_components/VendorsPageHeader";
import VendorsTable from "./_components/VendorsTable";
import VendorStats from "./_components/VendorStats";
import styles from "./page.module.css";

export default async function VendorsPage({ params, searchParams }) {
  const { lang } = await params;
  await requirePageAccess("vendors", lang);

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
      queryKey: ["admin", "vendors", filters],
      path: API_PATHS.admin.vendors.getAll,
      params: filters,
      token,
    });
  }

  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <div className={styles.container}>
        <VendorsPageHeader />
        <VendorStats />
        <VendorsTable />
      </div>
    </QueryClientServerProvider>
  );
}
