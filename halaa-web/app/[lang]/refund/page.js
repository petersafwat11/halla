import LegalPage from "@/ui/landing/Legal/LegalPage";
import { getLegalDocument } from "@halaa/shared/legal";
import Header from "@/ui/landing/Header/Header";
import Footer from "@/ui/landing/Footer/Footer";
import { buildLegalMetadata } from "@/ui/landing/Legal/legalMetadata";

const SIBLINGS = [
  { href: "/privacy", titleKey: "legal.siblings.privacy" },
  { href: "/terms", titleKey: "legal.siblings.terms" },
  { href: "/community-rules", titleKey: "legal.siblings.communityRules" },
  { href: "/support", titleKey: "legal.siblings.support" },
];

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return buildLegalMetadata({
    documentType: "refund",
    lang,
    titleAr: "سياسة الإلغاء والاسترداد – هلا",
    titleEn: "Cancellation & Refund Policy – Halaa",
    descAr: "سياسة الإلغاء والتأجيل والاسترداد في منصة هلا",
    descEn: "Cancellation, postponement, and refund policy for the Halaa platform",
  });
}

export default async function RefundPage({ params }) {
  const { lang } = await params;
  const doc = getLegalDocument("refund", lang);

  return (
    <>
      <Header lang={lang} variant="secondary" />
      <LegalPage doc={doc} lang={lang} siblingPages={SIBLINGS} />
      <Footer lang={lang} />
    </>
  );
}
