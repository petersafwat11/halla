import Header from "@/ui/landing/Header/Header";
import HeroSection from "@/ui/landing/HeroSection/HeroSection";
import FeaturesSection from "@/ui/landing/FeaturesSection/FeaturesSection";
import HowItWorks from "@/ui/landing/HowItWorks";
import InvitationsCarousel from "@/ui/landing/InvitationsCarousel/InvitationsCarousel";
import PricingSection from "@/ui/landing/PricingSection/PricingSection";
import AppDownloadSection from "@/ui/landing/AppDownloadSection/AppDownloadSection";
import VendorSearchSection from "@/ui/landing/VendorSearchSection/VendorSearchSection";
import VendorCTASection from "@/ui/landing/VendorCTASection/VendorCTASection";
import TestimonialsSection from "@/ui/landing/TestimonialsSection";
import CtaBanner from "@/ui/landing/CtaBanner";
import FaqSection from "@/ui/landing/FaqSection";
import Footer from "@/ui/landing/Footer/Footer";

export const metadata = {
  title: "هلا — منصة إدارة المناسبات الذكية | Halla",
  description: "أنشئ مناسباتك، أرسل دعوات رقمية عبر واتساب، وتتبع الحضور في الوقت الفعلي.",
};

export default async function LandingPage({ params }) {
  const { lang } = await params;

  return (
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
  );
}
