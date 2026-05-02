import { cookies } from "next/headers";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { requirePageAccess } from "@/services/serverAuth";
import ModeratorsPageContent from "./_components/ModeratorsPageContent";
import styles from "./page.module.css";

export default async function ModeratorsPage({ params, searchParams }) {
  const { lang } = await params;
  await requirePageAccess("moderators", lang);

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
      queryKey: ["admin", "moderators", filters],
      path: API_PATHS.admin.moderators.getAll,
      params: filters,
      token,
    });
  }

  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <div className={styles.container}>
        <ModeratorsPageContent />
      </div>
    </QueryClientServerProvider>
  );
}
