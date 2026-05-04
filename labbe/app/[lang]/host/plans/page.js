import { cookies } from "next/headers";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import PlansPage from "./PlansPage";

export default async function PlansPageServer({ params }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const queryClient = createServerQueryClient();

  if (token) {
    try {
      // Prefetch host plans
      await prefetchServerData({
        queryClient,
        queryKey: ["plans", "host"],
        path: API_PATHS.plans.getHostPlans,
        token,
      });

      // Prefetch user subscription
      await prefetchServerData({
        queryClient,
        queryKey: ["subscriptions", "my-subscription"],
        path: API_PATHS.subscriptions.getMySubscription,
        token,
      });
    } catch (error) {
      console.error("Error prefetching plans data:", error);
    }
  }

  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <PlansPage />
    </QueryClientServerProvider>
  );
}
