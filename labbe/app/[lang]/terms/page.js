import initTranslations from "@/localization/i18n";
import LegalPage from "@/ui/landing/Legal/LegalPage";
import termsData from "@/ui/landing/Legal/data/terms.json";
import Header from "@/ui/landing/Header/Header";
import Footer from "@/ui/landing/Footer/Footer";

const SIBLINGS = [
  {
    href: "/privacy",
    titleKey: "legal.siblings.privacy",
  },
  {
    href: "/refund",
    titleKey: "legal.siblings.refund",
  },
];

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { lang } = resolvedParams;
  const { t } = await initTranslations(lang, ["landing"]);

  return {
    title: t("legal.metadata.terms.title", "Terms & Conditions – Halaa"),
    description: t(
      "legal.metadata.terms.description",
      "Terms and conditions for using the Halaa event management platform"
    ),
  };
}

export default async function TermsPage({ params }) {
  const resolvedParams = await params;
  const { lang } = resolvedParams;
  const doc = termsData[lang] || termsData.ar;

  return (
    <>
      <Header lang={lang} variant="secondary" />
      <LegalPage doc={doc} lang={lang} siblingPages={SIBLINGS} />
      <Footer lang={lang} />
    </>
  );
}
