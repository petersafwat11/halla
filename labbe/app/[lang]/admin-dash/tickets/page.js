import { cookies } from "next/headers";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { requirePageAccess } from "@/services/serverAuth";
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
  const filters = {
    page: urlParams?.page || 1,
    limit: urlParams?.limit || 10,
    search: urlParams?.search,
    status: urlParams?.status,
    priority: urlParams?.priority,
    from: urlParams?.from,
    to: urlParams?.to,
  };

  if (token) {
    await prefetchServerData({
      queryClient,
      queryKey: ["tickets", filters],
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
