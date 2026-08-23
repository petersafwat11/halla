import { cookies } from "next/headers";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";
import { requirePageAccess } from "@/services/serverAuth";
import { ticketsKeys } from "@/hooks/tickets/keys";
import { normalizeTicketsFilters } from "@/utils/filterNormalizer";
import TicketsPageHeader from "./_components/TicketsPageHeader";
import TicketsTable from "./_components/TicketsTable";
import TicketStats from "./_components/TicketStats";
import styles from "./page.module.css";

export default async function TicketsPage({ params, searchParams }) {
  const { lang } = await params;
  await requirePageAccess("tickets", lang);

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const queryClient = createServerQueryClient();

  const urlParams = await searchParams;
  const filters = normalizeTicketsFilters(urlParams, { limit: 10 });

  if (token) {
    await prefetchServerData({
      queryClient,
      // Note: the previous literal `["tickets", filters]` here didn't match
      // the client `useMyTickets` queryKey shape — pre-existing bug. Swapping
      // to the factory aligns both, so SSR-prefetched data now hydrates the
      // client query as originally intended.
      queryKey: ticketsKeys.myTickets(filters),
      path: API_PATHS.tickets.getMyTickets,
      params: filters,
      token,
    });
  }

  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <div className={styles.container}>
        <TicketsPageHeader />
        <TicketStats />
        <TicketsTable />
      </div>
    </QueryClientServerProvider>
  );
}
