import { cookies } from "next/headers";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";
import { dashboardKeys } from "@/hooks/dashboard/keys";
import HostDashboardContent from "./HostDashboardContent";
import ErrorBoundary from "@/ui/common/error/ErrorBoundary";

export default async function HostPage({ params }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const queryClient = createServerQueryClient();

  let initialData = null;

  if (token) {
    try {
      // Prefetch dashboard stats for StatsCards
      initialData = await prefetchServerData({
        queryClient,
        queryKey: dashboardKeys.host(),
        path: API_PATHS.dashboard.getHostDashboard,
        token,
      });
    } catch (error) {
      console.error("Error prefetching dashboard:", error);
    }
  }
  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <ErrorBoundary>
        <HostDashboardContent />
      </ErrorBoundary>
    </QueryClientServerProvider>
  );
}

