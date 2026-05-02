import LegalPage from "@/ui/landing/Legal/LegalPage";
import termsData from "@/ui/landing/Legal/data/terms.json";

const SIBLINGS = [
  {
    href: "/privacy",
    title: { ar: "سياسة الخصوصية", en: "Privacy Policy" },
  },
  {
    href: "/refund",
    title: { ar: "سياسة الإلغاء والاسترداد", en: "Cancellation & Refund" },
  },
];

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return {
    title: lang === "ar" ? "الشروط والأحكام – هلا" : "Terms & Conditions – Halla",
    description:
      lang === "ar"
        ? "الشروط والأحكام الخاصة باستخدام منصة هلا لإدارة المناسبات"
        : "Terms and conditions for using the Halla event management platform",
  };
}

export default async function TermsPage({ params }) {
  const { lang } = await params;
  const doc = termsData[lang] || termsData.ar;

  return <LegalPage doc={doc} lang={lang} siblingPages={SIBLINGS} />;
}
