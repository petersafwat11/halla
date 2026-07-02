import LegalPage from "@/ui/landing/Legal/LegalPage";
import { getLegalDocument } from "@halla/shared/legal";
import { buildLegalMetadata } from "@/ui/landing/Legal/legalMetadata";
import Header from "@/ui/landing/Header/Header";
import Footer from "@/ui/landing/Footer/Footer";

const SIBLINGS = [
  { href: "/terms", titleKey: "legal.siblings.terms" },
  { href: "/privacy", titleKey: "legal.siblings.privacy" },
];

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return buildLegalMetadata({
    documentType: "community-rules",
    lang,
    titleAr: "قواعد المجتمع – هلا",
    titleEn: "Community Rules – Halaa",
    descAr: "قواعد المجتمع ومعايير المحتوى في منصة هلا",
    descEn: "Community rules and content standards for the Halaa platform",
  });
}

export default async function CommunityRulesPage({ params }) {
  const { lang } = await params;
  const doc = getLegalDocument("community-rules", lang);

  return (
    <>
      <Header lang={lang} variant="secondary" />
      <LegalPage doc={doc} lang={lang} siblingPages={SIBLINGS} />
      <Footer lang={lang} />
    </>
  );
}
