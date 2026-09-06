import LegalPage from "@/ui/landing/Legal/LegalPage";
import { getLegalDocument } from "@halaa/shared/legal";
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
  const baseDoc = getLegalDocument("privacy", lang);
  const doc = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ? {
    ...baseDoc,
    sections: [...baseDoc.sections, {
      id: 'website-analytics', num: String(baseDoc.sections.length + 1),
      label: lang === 'ar' ? 'إحصاءات الموقع' : 'Website analytics',
      title: lang === 'ar' ? 'إحصاءات استخدام الموقع الاختيارية' : 'Optional website usage analytics',
      body: lang === 'ar'
        ? 'بعد موافقتك، نستخدم Google Analytics لقياس زيارات الصفحة الرئيسية وعرض الأسعار والنقرات على التسجيل والتواصل ومزوّدي الخدمات، مع إحصاءات عامة لأخطاء الصفحة. قد تستخدم Google ملفات تعريف الارتباط ومعلومات الجهاز والشبكة لتقديم هذه الإحصاءات. لا نرسل تفاصيل الضيوف أو الدعوات أو محتوى الرسائل ضمن هذه الأحداث، ولا نفعّل تخصيص الإعلانات. يمكنك رفض الإحصاءات أو تغيير اختيارك من زر تفضيلات الإحصاءات في الصفحة الرئيسية. يؤدي سحب الموافقة إلى إيقاف جمع الأحداث؛ وقد تبقى ملفات تعريف الارتباط السابقة حتى انتهاء صلاحيتها أو حذفها من المتصفح.'
        : 'With your consent, we use Google Analytics to measure landing-page visits, pricing views, signup, contact and vendor clicks, and general page-error counts. Google may use cookies and device and network information to provide these statistics. We do not send guest details, invitations or message contents in these events, and advertising personalization is disabled. You can decline analytics or change your choice through Analytics preferences on the homepage. Withdrawing consent stops event collection; previously created cookies may remain until they expire or you delete them in your browser.',
    }],
  } : baseDoc;

  return (
    <>
      <Header lang={lang} variant="secondary" />
      <LegalPage doc={doc} lang={lang} siblingPages={SIBLINGS} />
      <Footer lang={lang} />
    </>
  );
}
