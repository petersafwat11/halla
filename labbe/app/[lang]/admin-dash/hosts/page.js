import { cookies } from "next/headers";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { requirePageAccess } from "@/services/serverAuth";
import HostsPageContent from "./_components/HostsPageContent";
import styles from "./page.module.css";

export default async function HostsPage({ params, searchParams }) {
  const { lang } = await params;
  await requirePageAccess("hosts", lang);

  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
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
      queryKey: ["admin", "hosts", filters],
      path: API_PATHS.admin.hosts.getAll,
      params: filters,
      token,
    });
  }

  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <div className={styles.container}>
        <HostsPageContent />
      </div>
    </QueryClientServerProvider>
  );
}
