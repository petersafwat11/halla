import MarketplaceView from "./_components/MarketplaceView";
import { buildMetadata, ROUTE_CLASS } from "@halaa/shared/brand";

// NOTE: listing content is client-rendered (`MarketplaceView`). This adds
// discovery metadata only; converting the listing to SSR for indexable
// per-vendor content is a separate task (see SEO-ROUTE-INVENTORY.md).
export async function generateMetadata({ params }) {
  const { lang } = await params;
  const isAr = lang === "ar";
  return buildMetadata({
    lang,
    path: "market-place",
    title: isAr ? "سوق مزوّدي خدمات المناسبات" : "Event Vendors Marketplace",
    description: isAr
      ? "اكتشف وتواصل مع مزوّدي خدمات المناسبات في السعودية: تصوير، ضيافة، تنسيق، وغيرها."
      : "Discover and connect with event service vendors in Saudi Arabia: photography, catering, styling, and more.",
    routeClass: ROUTE_CLASS.MARKETPLACE,
  });
}

export default function MarketPlacePage() {
  return <MarketplaceView />;
}
