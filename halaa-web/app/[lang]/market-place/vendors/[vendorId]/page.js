import { notFound } from "next/navigation";
import VendorProfile from "./VendorProfile";
import { getPublicVendor } from "../_lib/getPublicVendor";
import {
  buildMetadata,
  ROUTE_CLASS,
  AVAILABILITY,
  safeJsonLd,
  pruneEmpty,
  canonicalUrl,
} from "@halaa/shared/brand";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { vendorId, lang } = await params;
  const isAr = lang === "ar";
  try {
    const vendor = await getPublicVendor(vendorId, lang);
    // Unapproved/empty/deleted/suspended → backend 404s → getPublicVendor null →
    // the page below calls notFound() (correct 404, no soft-404). Returning {}
    // here keeps the default (noindex) root metadata for that transient case.
    if (!vendor) return {};
    const path = `market-place/vendors/${vendorId}`;
    const brandName = vendor.brandName || (isAr ? "مزوّد خدمات" : "Vendor");
    const description =
      (vendor.aboutExcerpt || vendor.about || vendor.tagline || "").slice(0, 155) ||
      (isAr ? "ملف مزوّد خدمات في سوق هلا" : "Vendor profile on Halaa Marketplace");
    return buildMetadata({
      lang,
      path,
      title: `${brandName} | ${isAr ? "سوق هلا" : "Halaa Marketplace"}`,
      description,
      routeClass: ROUTE_CLASS.VENDOR_PROFILE,
      ogType: "profile",
      images: vendor.heroImage ? [vendor.heroImage] : undefined,
    });
  } catch {
    return {};
  }
}

export default async function VendorPublicPage({ params }) {
  const { vendorId, lang } = await params;
  const vendor = await getPublicVendor(vendorId, lang);
  if (!vendor) notFound();

  const vendorUrl = canonicalUrl(lang, `market-place/vendors/${vendor.id}`);
  const contact = vendor.contact || {};
  const locationData = vendor.location || vendor.serviceLocation;
  const rtl = lang === "ar";
  const location = [
    rtl ? locationData?.districtNames?.[0]?.nameAr : locationData?.districtNames?.[0]?.nameEn,
    rtl ? locationData?.cityNameAr : locationData?.cityNameEn,
    rtl ? locationData?.regionNameAr : locationData?.regionNameEn,
  ]
    .filter(Boolean)
    .join("، ");

  // JSON-LD uses ONLY fields present in the backend PUBLIC vendor projection —
  // the same brand/contact the page renders visibly. Private identity /
  // verification fields (ownerFullName, nationalId, commercialRecord,
  // profileFile, adminNotes) are excluded by PUBLIC_VENDOR_SELECT and never
  // reach here. Serialized attack-safe (escapes </script>, &, U+2028/9) via
  // safeJsonLd — a vendor cannot inject markup through brandName/about.
  const jsonLd = pruneEmpty({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: vendor.brandName,
    description: vendor.about || vendor.tagline,
    image: vendor.heroImage || vendor.logo,
    telephone: contact.phone || undefined,
    email: contact.email || undefined,
    url: vendorUrl,
    areaServed: AVAILABILITY.countries.map((c) => ({ "@type": "Country", name: c })),
    address: location ? { "@type": "PostalAddress", addressLocality: location } : undefined,
  });

  return (
    <>
      <VendorProfile vendor={vendor} lang={lang} vendorUrl={vendorUrl} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
    </>
  );
}
