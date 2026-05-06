import { cookies } from "next/headers";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/new-backend/apiClient";
import { requirePageAccess } from "@/services/serverAuth";
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
      queryKey: ["discounts", "admin", filters],
      path: "/discounts/admin",
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
