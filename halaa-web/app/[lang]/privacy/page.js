import LegalPage from "@/ui/landing/Legal/LegalPage";
import { getLegalDocument } from "@halla/shared/legal";
import Header from "@/ui/landing/Header/Header";
import Footer from "@/ui/landing/Footer/Footer";
import { buildLegalMetadata } from "@/ui/landing/Legal/legalMetadata";

const SIBLINGS = [
  { href: "/terms", titleKey: "legal.siblings.terms" },
  { href: "/refund", titleKey: "legal.siblings.refund" },
  { href: "/community-rules", titleKey: "legal.siblings.communityRules" },
  { href: "/support", titleKey: "legal.siblings.support" },
];

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return buildLegalMetadata({
    documentType: "privacy",
    lang,
    titleAr: "سياسة الخصوصية – هلا",
    titleEn: "Privacy Policy – Halaa",
    descAr: "سياسة الخصوصية الخاصة بمنصة هلا لإدارة المناسبات",
    descEn: "Privacy policy for the Halaa event management platform",
  });
}

export default async function PrivacyPage({ params }) {
  const { lang } = await params;
  const doc = getLegalDocument("privacy", lang);

  return (
    <>
      <Header lang={lang} variant="secondary" />
      <LegalPage doc={doc} lang={lang} siblingPages={SIBLINGS} />
      <Footer lang={lang} />
    </>
  );
}
