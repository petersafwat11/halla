import DashboardVendorPage from "../../../../market-place/vendors/_components/DashboardVendorPage";

export const dynamic = "force-dynamic";

export default function AdminDashboardVendorPage({ params }) {
  return <DashboardVendorPage params={params} dashboardBasePath="admin-dash/market-place" />;
}
