import { cookies } from "next/headers";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { requirePageAccess } from "@/services/serverAuth";
import { adminKeys } from "@/hooks/admin/keys";
import DashboardPageHeader from "./_components/DashboardPageHeader";
import DashboardStats from "./_components/DashboardStats";
import DashboardCharts from "./_components/DashboardCharts";
import RecentActivity from "./_components/RecentActivity";
import ErrorBoundary from "@/ui/common/error/ErrorBoundary";
import styles from "./page.module.css";

export default async function AdminDashboardPage({ params, searchParams }) {
  const resolvedParams = await params;
  const { lang } = resolvedParams;

  await requirePageAccess("dashboard", lang);

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const queryClient = createServerQueryClient();

  const urlParams = await searchParams;
  const from = urlParams?.from;
  const to = urlParams?.to;
  const filters = {
    period: urlParams?.period || "month",
    ...(from && { from }),
    ...(to && { to }),
  };

  if (token) {
    try {
      await prefetchServerData({
        queryClient,
        queryKey: adminKeys.dashboard(filters),
        path: API_PATHS.dashboard.getAdminDashboard,
        params: filters,
        token,
      });
    } catch (error) {
      console.error("Error prefetching dashboard data:", error);
    }
  }

  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <ErrorBoundary>
        <div className={styles.container}>
          <DashboardPageHeader lang={lang} />
          <DashboardStats lang={lang} />
          <DashboardCharts lang={lang} />
          <RecentActivity lang={lang} />
        </div>
      </ErrorBoundary>
    </QueryClientServerProvider>
  );
}
