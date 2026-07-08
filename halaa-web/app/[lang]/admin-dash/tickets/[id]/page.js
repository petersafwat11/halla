import { cookies } from "next/headers";
import { requirePageAccess } from "@/services/serverAuth";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";
import { ticketsKeys } from "@/hooks/tickets/keys";
import TicketDetailsContent from "./_components/TicketDetailsContent";
import styles from "./page.module.css";

export default async function AdminTicketDetailsPage({ params }) {
  const { lang, id } = await params;
  await requirePageAccess("tickets", lang);

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const queryClient = createServerQueryClient();

  if (token) {
    await prefetchServerData({
      queryClient,
      queryKey: ticketsKeys.detail(id),
      path: API_PATHS.tickets.getTicketById(id),
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
