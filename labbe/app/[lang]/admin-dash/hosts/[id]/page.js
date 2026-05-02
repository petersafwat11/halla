import { cookies } from "next/headers";
import { requirePageAccess } from "@/services/serverAuth";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import HostDetailsContent from "./_components/HostDetailsContent";
import styles from "./page.module.css";

export default async function AdminHostDetailsPage({ params }) {
  const { lang, id } = await params;
  await requirePageAccess("hosts", lang);

  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const queryClient = createServerQueryClient();

  if (token) {
    await prefetchServerData({
      queryClient,
      queryKey: ["admin", "hosts", id],
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
