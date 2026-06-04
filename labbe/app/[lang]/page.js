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

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const { t } = await initTranslations(lang, ["landing"]);

  return {
    title: t("metadata.title", "هلا — منصة إدارة المناسبات الذكية | Halaa"),
    description: t(
      "metadata.description",
      "أنشئ مناسباتك، أرسل دعوات رقمية عبر واتساب، وتتبع الحضور في الوقت الفعلي."
    ),
  };
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
