import LegalPage from "@/ui/landing/Legal/LegalPage";
import refundData from "@/ui/landing/Legal/data/refund.json";
import Header from "@/ui/landing/Header/Header";
import Footer from "@/ui/landing/Footer/Footer";

const SIBLINGS = [
  {
    href: "/privacy",
    titleKey: "legal.siblings.privacy",
  },
  {
    href: "/terms",
    titleKey: "legal.siblings.terms",
  },
];

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return {
    title: lang === "ar" ? "سياسة الإلغاء والاسترداد – هلا" : "Cancellation & Refund Policy – Halaa",
    description:
      lang === "ar"
        ? "سياسة الإلغاء والتأجيل والاسترداد في منصة هلا"
        : "Cancellation, postponement, and refund policy for the Halaa platform",
  };
}

export default async function RefundPage({ params }) {
  const { lang } = await params;
  const doc = refundData[lang] || refundData.ar;

  return (
    <>
      <Header lang={lang} variant="secondary" />
      <LegalPage doc={doc} lang={lang} siblingPages={SIBLINGS} />
      <Footer lang={lang} />
    </>
  );
}
