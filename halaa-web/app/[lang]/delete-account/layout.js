/**
 * Server-component layout for the PUBLIC delete-account page (LEG/§6, SEO-01).
 *
 * The page itself is a `"use client"` component (interactive deletion flow), so
 * it cannot export metadata. This co-located server layout supplies the
 * indexable legal metadata (canonical + reciprocal AR/EN hreflang + OG +
 * `robots:index`) — otherwise the page would inherit the root DEFAULT-DENY
 * `noindex`, but this is the canonical Google Play data-deletion URL and MUST be
 * indexable.
 */

import { buildLegalMetadata } from "@/ui/landing/Legal/legalMetadata";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return buildLegalMetadata({
    documentType: "deletion",
    lang,
    titleAr: "حذف الحساب والبيانات – هلا",
    titleEn: "Account & Data Deletion – Halaa",
    descAr: "كيفية حذف حساب هلا وبياناتك الشخصية، وما يتم الاحتفاظ به قانونيًا.",
    descEn: "How to delete your Halaa account and personal data, and what is legally retained.",
  });
}

export default function DeleteAccountLayout({ children }) {
  return children;
}
