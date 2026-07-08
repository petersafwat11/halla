"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const GlobeIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

export default function LangToggle({ className }) {
  const pathname = usePathname();
  const lang = pathname?.split("/")[1] === "en" ? "en" : "ar";
  const otherLang = lang === "ar" ? "en" : "ar";
  const switchHref = pathname ? pathname.replace(`/${lang}`, `/${otherLang}`) : `/${otherLang}`;
  const switchLabel = lang === "ar" ? "EN" : "AR";

  return (
    <Link href={switchHref} className={className} aria-label="Switch language">
      <GlobeIcon />
      <span>{switchLabel}</span>
    </Link>
  );
}
