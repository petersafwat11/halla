import { cookies } from "next/headers";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { requirePageAccess } from "@/services/serverAuth";
import ErrorBoundary from "@/ui/common/error/ErrorBoundary";
import ManagePlansContent from "./_components/ManagePlansContent";
import styles from "./page.module.css";

export default async function AdminManagePlansPage({ params }) {
  const { lang } = await params;
  await requirePageAccess("manage-plans", lang);

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const queryClient = createServerQueryClient();

  if (token) {
    await prefetchServerData({
      queryClient,
      queryKey: ["admin", "plans"],
      path: API_PATHS.plans.adminGetAll,
      token,
    });
  }

  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <div className={styles.container}>
        <ErrorBoundary>
          <ManagePlansContent />
        </ErrorBoundary>
      </div>
    </QueryClientServerProvider>
  );
}
