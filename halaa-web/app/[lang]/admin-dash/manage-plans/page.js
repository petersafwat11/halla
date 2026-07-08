import { cookies } from "next/headers";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";
import { requirePageAccess } from "@/services/serverAuth";
import { adminKeys } from "@/hooks/admin/keys";
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
      // Note: client uses `adminKeys.plans(filters)` with a filters arg;
      // the prefetch here passes no params, so we use the prefix.
      queryKey: adminKeys.plansAll(),
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
