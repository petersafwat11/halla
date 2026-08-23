import { cookies } from "next/headers";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";
import { requirePageAccess } from "@/services/serverAuth";
import { adminKeys } from "@/hooks/admin/keys";
import { normalizePaymentsFilters } from "@/utils/filterNormalizer";
import PaymentsPageHeader from "./_components/PaymentsPageHeader";
import PaymentStats from "./_components/PaymentStats";
import PaymentsTable from "./_components/PaymentsTable";
import styles from "./page.module.css";

export default async function PaymentsPage({ params, searchParams }) {
  const { lang } = await params;
  await requirePageAccess("payments", lang);

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const queryClient = createServerQueryClient();

  const urlParams = await searchParams;
  const filters = normalizePaymentsFilters(urlParams, { limit: 20 });

  if (token) {
    await prefetchServerData({
      queryClient,
      queryKey: adminKeys.payments(filters),
      path: API_PATHS.payments.getAll,
      params: filters,
      token,
    });
  }

  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <div className={styles.container}>
        <PaymentsPageHeader />
        <PaymentStats />
        <PaymentsTable />
      </div>
    </QueryClientServerProvider>
  );
}
