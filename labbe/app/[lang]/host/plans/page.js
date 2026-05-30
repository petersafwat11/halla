import { cookies } from "next/headers";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";
import ErrorBoundary from "@/ui/common/error/ErrorBoundary";
import { subscriptionsKeys } from "@/hooks/subscriptions/keys";
import { plansKeys } from "@/hooks/plans/keys";
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
        queryKey: plansKeys.host(),
        path: API_PATHS.plans.getHostPlans,
        token,
      });

      // Prefetch user subscription
      await prefetchServerData({
        queryClient,
        queryKey: subscriptionsKeys.mine(),
        path: API_PATHS.subscriptions.getMySubscription,
        token,
      });
    } catch {
      // Prefetch is best-effort; client-side fetch will retry and surface errors.
    }
  }

  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <ErrorBoundary>
        <PlansPage />
      </ErrorBoundary>
    </QueryClientServerProvider>
  );
}
