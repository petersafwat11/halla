import { cookies } from "next/headers";
import { requirePageAccess } from "@/services/serverAuth";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import TicketDetailsContent from "./_components/TicketDetailsContent";
import styles from "./page.module.css";

export default async function AdminTicketDetailsPage({ params }) {
  const { lang, id } = await params;
  await requirePageAccess("tickets", lang);

  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const queryClient = createServerQueryClient();

  if (token) {
    await prefetchServerData({
      queryClient,
      queryKey: ["tickets", id],
      path: API_PATHS.tickets.getById(id),
      token,
    });
  }

  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <div className={styles.container}>
        <TicketDetailsContent ticketId={id} />
      </div>
    </QueryClientServerProvider>
  );
}
