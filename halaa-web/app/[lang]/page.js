import Header from "@/ui/landing/Header/Header";
import HeroSection from "@/ui/landing/HeroSection/HeroSection";
import FeaturesSection from "@/ui/landing/FeaturesSection/FeaturesSection";
import HowItWorks from "@/ui/landing/HowItWorks";
import InvitationsCarousel from "@/ui/landing/InvitationsCarousel/InvitationsCarousel";
import PricingSection from "@/ui/landing/PricingSection/PricingSection";
import VendorSearchSection from "@/ui/landing/VendorSearchSection/VendorSearchSection";
import VendorCTASection from "@/ui/landing/VendorCTASection/VendorCTASection";
import CtaBanner from "@/ui/landing/CtaBanner";
import FaqSection from "@/ui/landing/FaqSection";
import Footer from "@/ui/landing/Footer/Footer";
import ErrorBoundary from "@/ui/common/error/ErrorBoundary";
import initTranslations from "@/localization/i18n";
import { buildMetadata, ROUTE_CLASS, DEFAULT_METADATA } from "@halaa/shared/brand";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const { t } = await initTranslations(lang, ["landing"]);
  const loc = DEFAULT_METADATA[lang] || DEFAULT_METADATA.ar;

  return buildMetadata({
    lang,
    path: "",
    title: t("metadata.title", loc.title),
    description: t("metadata.description", loc.description),
    routeClass: ROUTE_CLASS.LANDING,
  });
}

export default async function LandingPage({ params }) {
  const { lang } = await params;

  return (
    <ErrorBoundary
      fallbackTitle="خطأ في التحميل"
      fallbackMessage="حدث خطأ أثناء تحميل الصفحة. يرجى المحاولة مرة أخرى."
    >
      <div>
        <Header lang={lang} />
        <main>
          <HeroSection lang={lang} />
          <CtaBanner lang={lang} />
          <FeaturesSection lang={lang} />
          <HowItWorks lang={lang} />
          <PricingSection lang={lang} />
          <InvitationsCarousel lang={lang} />
          <VendorSearchSection lang={lang} />
          <VendorCTASection lang={lang} />
          <FaqSection lang={lang} />
        </main>
        <Footer lang={lang} />
      </div>
    </ErrorBoundary>
  );
}
