import Header from "@/ui/landing/Header/Header";
import HeroSection from "@/ui/landing/HeroSection/HeroSection";
import FeaturesSection from "@/ui/landing/FeaturesSection/FeaturesSection";
import HowItWorks from "@/ui/landing/HowItWorks";
import InvitationsCarousel from "@/ui/landing/InvitationsCarousel/InvitationsCarousel";
import PricingSection from "@/ui/landing/PricingSection/PricingSection";
import VendorSearchSection from "@/ui/landing/VendorSearchSection/VendorSearchSection";
import { getLandingVendors } from "@/ui/landing/VendorSearchSection/getLandingVendors";
import VendorCTASection from "@/ui/landing/VendorCTASection/VendorCTASection";
import CtaBanner from "@/ui/landing/CtaBanner";
import FaqSection from "@/ui/landing/FaqSection";
import Footer from "@/ui/landing/Footer/Footer";
import ErrorBoundary from "@/ui/common/error/ErrorBoundary";
import initTranslations from "@/localization/i18n";
import { buildMetadata, ROUTE_CLASS, DEFAULT_METADATA } from "@halaa/shared/brand";
import { getLandingPlans } from '@/ui/landing/getLandingPlans';
import LandingAnalytics from '@/ui/landing/LandingAnalytics';
import styles from '@/ui/landing/landing.module.css';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const { t } = await initTranslations(lang, ["landing"]);
  const loc = DEFAULT_METADATA[lang] || DEFAULT_METADATA.ar;

  const title = lang === 'ar'
    ? 'هلا | دعوات واتساب وإدارة المناسبات في السعودية'
    : 'Halaa | WhatsApp Invitations & Event Management';
  const metadata = buildMetadata({
    lang,
    path: "",
    title,
    description: t("metadata.description", loc.description),
    routeClass: ROUTE_CLASS.LANDING,
  });
  return { ...metadata, title: { absolute: title } };
}

export default async function LandingPage({ params }) {
  const { lang } = await params;
  const [vendors, initialPlans] = await Promise.all([getLandingVendors(lang), getLandingPlans()]);

  return (
    <ErrorBoundary
      fallbackTitle="خطأ في التحميل"
      fallbackMessage="حدث خطأ أثناء تحميل الصفحة. يرجى المحاولة مرة أخرى."
    >
      <div className={styles.landing}>
        <a href="#main-content" className={styles.skipLink}>{lang === 'ar' ? 'تخطي إلى المحتوى الرئيسي' : 'Skip to main content'}</a>
        <LandingAnalytics lang={lang} />
        <Header lang={lang} />
        <main id="main-content" tabIndex={-1}>
          <HeroSection lang={lang} />
          <CtaBanner lang={lang} />
          <FeaturesSection lang={lang} />
          <HowItWorks lang={lang} />
          <PricingSection lang={lang} initialPlans={initialPlans} />
          <InvitationsCarousel lang={lang} />
          <VendorSearchSection lang={lang} vendors={vendors} />
          <VendorCTASection lang={lang} />
          <FaqSection lang={lang} />
        </main>
        <Footer lang={lang} />
      </div>
    </ErrorBoundary>
  );
}
