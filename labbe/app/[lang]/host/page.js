import { cookies } from "next/headers";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import HostDashboardContent from "./HostDashboardContent";

export default async function HostPage({ params }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const queryClient = createServerQueryClient();

  let initialData = null;

  if (token) {
    try {
      // Prefetch dashboard stats for StatsCards
      initialData = await prefetchServerData({
        queryClient,
        queryKey: ["dashboard", "host"],
        path: API_PATHS.dashboard.getHostDashboard,
        token,
      });
    } catch (error) {
      console.error("Error prefetching dashboard:", error);
    }
  }
  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <HostDashboardContent />
    </QueryClientServerProvider>
  );
}

