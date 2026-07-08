import DashboardVendorPage from "../../../../market-place/vendors/_components/DashboardVendorPage";

export const dynamic = "force-dynamic";

export default function HostVendorPage({ params }) {
  return <DashboardVendorPage params={params} dashboardBasePath="host/market-place" />;
}
