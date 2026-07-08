import { cookies } from "next/headers";
import { requirePageAccess } from "@/services/serverAuth";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";
import { adminKeys } from "@/hooks/admin/keys";
import HostDetailsContent from "./_components/HostDetailsContent";
import styles from "./page.module.css";

export default async function AdminHostDetailsPage({ params }) {
  const { lang, id } = await params;
  await requirePageAccess("hosts", lang);

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const queryClient = createServerQueryClient();

  if (token) {
    await prefetchServerData({
      queryClient,
      queryKey: adminKeys.hostDetail(id),
      path: API_PATHS.admin.hosts.getById(id),
      token,
    });
  }

  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <div className={styles.container}>
        <HostDetailsContent hostId={id} />
      </div>
    </QueryClientServerProvider>
  );
}
