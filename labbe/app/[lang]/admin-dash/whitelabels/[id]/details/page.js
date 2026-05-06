import { cookies } from "next/headers";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { requirePageAccess } from "@/services/serverAuth";
import WhitelabelDetailsWrapper from "./_components/WhitelabelDetailsWrapper";

export default async function WhitelabelDetailsPage({ params }) {
  const { lang, id } = await params;
  await requirePageAccess("whitelabels", lang);

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const queryClient = createServerQueryClient();

  if (token) {
    try {
      await prefetchServerData({
        queryClient,
        queryKey: ["admin", "whitelabels", "details", id],
        path: API_PATHS.admin.whitelabels.getById(id),
        token,
      });
    } catch (error) {
      console.error("Error prefetching whitelabel details:", error);
    }
  }

  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <WhitelabelDetailsWrapper whitelabelId={id} />
    </QueryClientServerProvider>
  );
}
