import { cookies } from "next/headers";
import { requirePageAccess } from "@/services/serverAuth";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";
import { adminKeys } from "@/hooks/admin/keys";
import BusinessDetailsContent from "./_components/BusinessDetailsContent";
import styles from "./page.module.css";

export default async function AdminBusinessDetailsPage({ params }) {
  const { lang, id } = await params;
  await requirePageAccess("businesses", lang);

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const queryClient = createServerQueryClient();

  if (token) {
    await prefetchServerData({
      queryClient,
      queryKey: adminKeys.businessDetail(id),
      path: API_PATHS.admin.businesses.getById(id),
      token,
    });
  }

  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <div className={styles.container}>
        <BusinessDetailsContent businessId={id} />
      </div>
    </QueryClientServerProvider>
  );
}
