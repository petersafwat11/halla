import { cookies } from "next/headers";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";
import { requirePageAccess } from "@/services/serverAuth";
import { adminKeys } from "@/hooks/admin/keys";
import BusinessesPageContent from "./_components/BusinessesPageContent";
import styles from "./page.module.css";

export default async function BusinessesPage({ params, searchParams }) {
  const { lang } = await params;
  await requirePageAccess("businesses", lang);

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const queryClient = createServerQueryClient();

  const urlParams = await searchParams;
  const filters = {
    page: urlParams?.page || 1,
    limit: urlParams?.limit || 10,
    search: urlParams?.search,
    status: urlParams?.status,
    from: urlParams?.from,
    to: urlParams?.to,
  };

  if (token) {
    await prefetchServerData({
      queryClient,
      queryKey: adminKeys.businesses(filters),
      path: API_PATHS.admin.businesses.getAll,
      params: filters,
      token,
    });
  }

  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <div className={styles.container}>
        <BusinessesPageContent />
      </div>
    </QueryClientServerProvider>
  );
}
