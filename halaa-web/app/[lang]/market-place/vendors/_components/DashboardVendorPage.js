import { notFound } from "next/navigation";
import VendorProfile from "../[vendorId]/VendorProfile";
import { getPublicVendor } from "../_lib/getPublicVendor";

const appBase = process.env.NEXT_PUBLIC_APP_URL || "https://halaa.com.sa";

export default async function DashboardVendorPage({ params, dashboardBasePath }) {
  const { vendorId, lang } = await params;
  const vendor = await getPublicVendor(vendorId, lang);

  if (!vendor) notFound();

  const publicVendorUrl = `${appBase}/${lang}/market-place/vendors/${vendor.id}`;

  return (
    <VendorProfile
      vendor={vendor}
      lang={lang}
      vendorUrl={publicVendorUrl}
      marketplaceHref={`/${lang}/${dashboardBasePath}`}
    />
  );
}
