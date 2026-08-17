import LegalPage from "@/ui/landing/Legal/LegalPage";
import { getLegalDocument } from "@halaa/shared/legal";
import { buildLegalMetadata } from "@/ui/landing/Legal/legalMetadata";
import Header from "@/ui/landing/Header/Header";
import Footer from "@/ui/landing/Footer/Footer";

const SIBLINGS = [
  { href: "/privacy", titleKey: "legal.siblings.privacy" },
  { href: "/terms", titleKey: "legal.siblings.terms" },
];

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return buildLegalMetadata({
    documentType: "support",
    lang,
    titleAr: "الدعم والتواصل – هلا",
    titleEn: "Support & Contact – Halaa",
    descAr: "صفحة الدعم والتواصل الخاصة بمنصة هلا",
    descEn: "Support and contact page for the Halaa platform",
  });
}

export default async function SupportPage({ params }) {
  const { lang } = await params;
  const doc = getLegalDocument("support", lang);

  return (
    <>
      <Header lang={lang} variant="secondary" />
      <LegalPage doc={doc} lang={lang} siblingPages={SIBLINGS} />
      <Footer lang={lang} />
    </>
  );
}
