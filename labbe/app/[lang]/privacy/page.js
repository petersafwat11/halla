import LegalPage from "@/ui/landing/Legal/LegalPage";
import privacyData from "@/ui/landing/Legal/data/privacy.json";

const SIBLINGS = [
  {
    href: "/terms",
    titleKey: "legal.siblings.terms",
  },
  {
    href: "/refund",
    titleKey: "legal.siblings.refund",
  },
];

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return {
    title: lang === "ar" ? "سياسة الخصوصية – هلا" : "Privacy Policy – Halla",
    description:
      lang === "ar"
        ? "سياسة الخصوصية الخاصة بمنصة هلا لإدارة المناسبات"
        : "Privacy policy for the Halla event management platform",
  };
}

export default async function PrivacyPage({ params }) {
  const { lang } = await params;
  const doc = privacyData[lang] || privacyData.ar;

  return <LegalPage doc={doc} lang={lang} siblingPages={SIBLINGS} />;
}
