import { notFound } from "next/navigation";
import VendorProfile from "./VendorProfile";

export const dynamic = "force-dynamic";
const apiBase = process.env.INTERNAL_API_URL || "http://localhost:8000/api/v2";
const appBase = process.env.NEXT_PUBLIC_APP_URL || "https://halaa.com.sa";

async function getVendor(vendorId, lang = "ar") {
  const response = await fetch(`${apiBase}/vendors/public/${vendorId}?lang=${lang}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Unable to load vendor");
  const payload = await response.json();
  return payload?.data?.vendor || null;
}

export async function generateMetadata({ params }) {
  const { vendorId, lang } = await params;
  try {
    const vendor = await getVendor(vendorId, lang);
    if (!vendor) return {};
    const description = vendor.about?.slice(0, 155) || vendor.tagline || (lang === "ar" ? "ملف مزود خدمات في سوق هلا" : "Vendor profile on Halla Marketplace");
    const canonical = `${appBase}/${lang}/market-place/vendors/${vendorId}`;
    return {
      title: `${vendor.brandName} | ${lang === "ar" ? "سوق هلا" : "Halla Marketplace"}`,
      description,
      alternates: { canonical },
      openGraph: { title: vendor.brandName, description, url: canonical, images: vendor.heroImage ? [vendor.heroImage] : [] },
    };
  } catch { return {}; }
}

export default async function VendorPublicPage({ params }) {
  const { vendorId, lang } = await params;
  const vendor = await getVendor(vendorId, lang);
  if (!vendor) notFound();

  const vendorUrl = `${appBase}/${lang}/market-place/vendors/${vendor.id}`;
  const contact = vendor.contact || {};
  const locationData = vendor.location || vendor.serviceLocation;
  const rtl = lang === "ar";
  const location = [
    rtl ? locationData?.districtNames?.[0]?.nameAr : locationData?.districtNames?.[0]?.nameEn,
    rtl ? locationData?.cityNameAr : locationData?.cityNameEn,
    rtl ? locationData?.regionNameAr : locationData?.regionNameEn,
  ].filter(Boolean).join("، ");

  return (
    <>
      <VendorProfile vendor={vendor} lang={lang} vendorUrl={vendorUrl} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: vendor.brandName,
          description: vendor.about || vendor.tagline,
          image: vendor.heroImage || vendor.logo,
          telephone: contact.phone || undefined,
          email: contact.email || undefined,
          url: vendorUrl,
          address: location ? { "@type": "PostalAddress", addressLocality: location } : undefined,
        }) }}
      />
    </>
  );
}
