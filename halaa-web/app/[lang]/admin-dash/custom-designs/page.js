import { cookies } from "next/headers";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";
import { requirePageAccess } from "@/services/serverAuth";
import { addonsKeys } from "@/hooks/addons/keys";
import { normalizeFulfillmentFilters } from "@/utils/filterNormalizer";
import CustomDesignsPageContent from "./_components/CustomDesignsPageContent";

export default async function CustomDesignsPage({ params, searchParams }) {
  const { lang } = await params;
  await requirePageAccess("custom-designs", lang);

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const queryClient = createServerQueryClient();

  const urlParams = await searchParams;
  const filters = normalizeFulfillmentFilters(urlParams, { limit: 20 });

  if (token) {
    await prefetchServerData({
      queryClient,
      queryKey: addonsKeys.adminFulfillment(filters),
      path: API_PATHS.addons.adminFulfillment,
      params: filters,
      token,
    });
  }

  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <CustomDesignsPageContent />
    </QueryClientServerProvider>
  );
}
