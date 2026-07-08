import { cookies } from "next/headers";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";
import { requirePageAccess } from "@/services/serverAuth";
import { discountsKeys } from "@/hooks/discounts/keys";
import DiscountsPageContent from "./_components/DiscountsPageContent";

export default async function DiscountsPage({ params, searchParams }) {
  const { lang } = await params;
  await requirePageAccess("discounts", lang);

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const queryClient = createServerQueryClient();

  const urlParams = await searchParams;
  const status = urlParams?.status;
  const filters = {
    page: urlParams?.page || 1,
    limit: 20,
    search: urlParams?.search || undefined,
    isActive: status === "active" ? true : status === "inactive" ? false : undefined,
  };

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
