import { cookies } from "next/headers";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { requirePageAccess } from "@/services/serverAuth";
import ErrorBoundary from "@/ui/common/error/ErrorBoundary";
import AdminPaymentsClient from "./_components/AdminPaymentsClient";

export default async function PaymentsPage({ params }) {
  const { lang } = await params;
  await requirePageAccess("payments", lang);

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const queryClient = createServerQueryClient();

  if (token) {
    await prefetchServerData({
      queryClient,
      queryKey: ["admin", "payments", { page: 1, limit: 20 }],
      path: API_PATHS.payments.getAll,
      params: { page: 1, limit: 20 },
      token,
    });
  }

  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <ErrorBoundary>
        <AdminPaymentsClient />
      </ErrorBoundary>
    </QueryClientServerProvider>
  );
}
