import { cookies } from "next/headers";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import AdminPageHeader from "./_components/AdminPageHeader";
import DashboardStats from "./_components/DashboardStats";
import DashboardCharts from "./_components/DashboardCharts";
import RecentActivity from "./_components/RecentActivity";
import styles from "./page.module.css";

export default async function AdminDashboardPage({ searchParams }) {
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
    await prefetchServerData({
      queryClient,
      queryKey: ["admin", "dashboard", filters],
      path: API_PATHS.dashboard.getAdminDashboard,
      params: filters,
      token,
    });
  }

  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <div className={styles.container}>
        <AdminPageHeader
          title="لوحة التحكم"
          subtitle="نظرة عامة على الأداء والإحصائيات"
        />
        <DashboardStats />
        <DashboardCharts />
        <RecentActivity />
      </div>
    </QueryClientServerProvider>
  );
}
