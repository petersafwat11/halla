import DashboardVendorPage from "../../../../market-place/vendors/_components/DashboardVendorPage";

export const dynamic = "force-dynamic";

export default function VendorDashboardVendorPage({ params }) {
  return <DashboardVendorPage params={params} dashboardBasePath="vendor-dashboard/market-place" />;
}
