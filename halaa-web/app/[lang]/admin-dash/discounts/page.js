import { cookies } from "next/headers";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";
import { requirePageAccess } from "@/services/serverAuth";
import { discountsKeys } from "@/hooks/discounts/keys";
import { normalizeDiscountsFilters } from "@/utils/filterNormalizer";
import DiscountsPageContent from "./_components/DiscountsPageContent";

export default async function DiscountsPage({ params, searchParams }) {
  const { lang } = await params;
  await requirePageAccess("discounts", lang);

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const queryClient = createServerQueryClient();

  const urlParams = await searchParams;
  const filters = normalizeDiscountsFilters(urlParams, { limit: 20 });

  if (token) {
    await prefetchServerData({
      queryClient,
      queryKey: discountsKeys.adminList(filters),
      path: API_PATHS.discounts.list,
      params: filters,
      token,
    });
  }

  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <DiscountsPageContent />
    </QueryClientServerProvider>
  );
}
