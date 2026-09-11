import { cookies } from "next/headers";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";
import { requirePageAccess } from "@/services/serverAuth";
import { adminKeys } from "@/hooks/admin/keys";
import { normalizePaymentLinksFilters } from "@/utils/filterNormalizer";
import PaymentsPageHeader from "../_components/PaymentsPageHeader";
import PaymentsTabs from "../_components/PaymentsTabs";
import PaymentLinkStats from "../_components/PaymentLinkStats";
import PaymentLinksTable from "../_components/PaymentLinksTable";
import styles from "../page.module.css";

export default async function PaymentLinksPage({ params, searchParams }) {
  const { lang } = await params;
  await requirePageAccess("payments", lang);

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const queryClient = createServerQueryClient();

  const urlParams = await searchParams;
  const filters = normalizePaymentLinksFilters(urlParams, { limit: 20 });

  if (token) {
    await Promise.all([prefetchServerData({
      queryClient,
      queryKey: adminKeys.paymentLinks(filters),
      path: API_PATHS.paymentLinks.getAll,
      params: filters,
      token,
    }), prefetchServerData({
      queryClient,
      queryKey: adminKeys.paymentLinksConfig(),
      path: API_PATHS.paymentLinks.config,
      token,
    })]).catch(() => {});
  }

  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <div className={styles.container}>
        <PaymentsPageHeader wholeDays />
        <PaymentsTabs />
        <PaymentLinkStats />
        <PaymentLinksTable />
      </div>
    </QueryClientServerProvider>
  );
}
