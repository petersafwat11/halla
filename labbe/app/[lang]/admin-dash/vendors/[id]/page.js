import { cookies } from "next/headers";
import { requirePageAccess } from "@/services/serverAuth";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import VendorDetailsContent from "./_components/VendorDetailsContent";
import styles from "./page.module.css";

export default async function AdminVendorDetailsPage({ params }) {
  const { lang, id } = await params;
  await requirePageAccess("vendors", lang);

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const queryClient = createServerQueryClient();

  if (token) {
    await prefetchServerData({
      queryClient,
      queryKey: ["admin", "vendors", id],
      path: API_PATHS.admin.vendors.getById(id),
      token,
    });
  }

  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <div className={styles.container}>
        <VendorDetailsContent vendorId={id} />
      </div>
    </QueryClientServerProvider>
  );
}
