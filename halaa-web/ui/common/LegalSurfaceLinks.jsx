import Link from "next/link";
import { LEGAL_ROUTES } from "@halaa/shared/legal";
import styles from "./legalSurfaceLinks.module.css";

const LABELS = {
  ar: {
    terms: "الشروط والأحكام",
    privacy: "سياسة الخصوصية",
    "community-rules": "قواعد المجتمع",
    refund: "الإلغاء والاسترداد",
    deletion: "حذف الحساب والبيانات",
    support: "الدعم والتواصل",
  },
  en: {
    terms: "Terms",
    privacy: "Privacy",
    "community-rules": "Community Rules",
    refund: "Cancellation & Refund",
    deletion: "Account & Data Deletion",
    support: "Support",
  },
};

export default function LegalSurfaceLinks({
  lang = "ar",
  documents = ["terms", "privacy", "community-rules"],
  className = "",
}) {
  const locale = lang === "en" ? "en" : "ar";

  return (
    <nav
      className={`${styles.links} ${className}`.trim()}
      aria-label={locale === "ar" ? "الروابط القانونية" : "Legal links"}
    >
      {documents.map((documentType, index) => (
        <span key={documentType} className={styles.item}>
          {index > 0 && <span className={styles.separator} aria-hidden="true">·</span>}
          <Link href={`/${locale}/${LEGAL_ROUTES[documentType]}`} className={styles.link}>
            {LABELS[locale][documentType]}
          </Link>
        </span>
      ))}
    </nav>
  );
}
