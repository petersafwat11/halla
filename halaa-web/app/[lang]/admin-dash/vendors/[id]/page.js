import { cookies } from "next/headers";
import { requirePageAccess } from "@/services/serverAuth";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";
import { adminKeys } from "@/hooks/admin/keys";
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
      queryKey: adminKeys.vendorDetail(id),
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
