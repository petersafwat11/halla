"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import styles from "./LegalPage.module.css";
import UseLanguageChange from "@/hooks/UseLanguageChange";

/* ─── Contact constants ─── */
const CONTACT_EMAIL = "mailto:admin@labbe.com";
const CONTACT_WA = "https://wa.me/966500000000";

/* ─── Icons ─── */
const IconHome = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const IconChevronRight = ({ isRtl }) => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={isRtl ? styles.iconFlipped : styles.iconFlippable}
  >
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const IconChevronDown = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const IconArrowUpRight = ({ isRtl }) => (
  <svg
    width="11"
    height="11"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={isRtl ? styles.iconFlipped : styles.iconFlippable}
  >
    <line x1="7" y1="17" x2="17" y2="7"/>
    <polyline points="7 7 17 7 17 17"/>
  </svg>
);

const IconCalendar = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const IconEmail = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

const IconWhatsApp = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const IconFileText = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);

const IconArrowUp = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5"/>
    <polyline points="5 12 12 5 19 12"/>
  </svg>
);

/* ─── Main ─── */
export default function LegalPage({ doc, lang, siblingPages = [] }) {
  const isRtl = lang === "ar";
  const { t } = useTranslation("landing");
  const pathname = usePathname();
  const { currentLocale, handleChange } = UseLanguageChange();

  const [activeId, setActiveId] = useState(doc.sections[0]?.id ?? null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const tocDropdownRef = useRef(null);

  // Intersection observer for active section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: "-10% 0px -75% 0px" }
    );
    doc.sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [doc.sections]);

  // Scroll progress + back-to-top visibility
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const scrollTop = el.scrollTop || document.body.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      setScrollProgress(scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0);
      setShowBackToTop(scrollTop > 400);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close TOC dropdown on outside click
  useEffect(() => {
    const onClickOutside = (e) => {
      if (tocDropdownRef.current && !tocDropdownRef.current.contains(e.target)) {
        setTocOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: "smooth" }), []);

  const activeSection = doc.sections.find((s) => s.id === activeId);

  const isCurrentSibling = (href) => pathname?.endsWith(href);

  return (
    <div className={styles.root} dir={isRtl ? "rtl" : "ltr"}>

      {/* ── Reading progress bar ── */}
      <div
        className={styles.progressBar}
        style={{ "--progress": `${scrollProgress}%` }}
        role="progressbar"
        aria-valuenow={Math.round(scrollProgress)}
        aria-valuemin={0}
        aria-valuemax={100}
      />

      {/* ══════════════ HERO ══════════════ */}
      <header className={styles.hero}>
        <div className={styles.heroInner}>

          {/* Top row: breadcrumb + lang toggle */}
          <div className={styles.heroTopRow}>
            <nav className={styles.breadcrumb} aria-label="breadcrumb">
              <Link href={`/${lang}`} className={styles.breadcrumbLink}>
                <IconHome />
                <span>{t("legal.backHome")}</span>
              </Link>
              <span className={styles.breadcrumbSep} aria-hidden="true">
                <IconChevronRight isRtl={isRtl} />
              </span>
              <span className={styles.breadcrumbCurrent}>{doc.badge}</span>
            </nav>

            {/* Lang toggle */}
            <div className={styles.langToggle}>
              <button
                className={currentLocale === "ar" ? styles.langActive : styles.langOption}
                onClick={() => handleChange("ar")}
              >
                {t("legal.langAr", "العربية")}
              </button>
              <button
                className={currentLocale === "en" ? styles.langActive : styles.langOption}
                onClick={() => handleChange("en")}
              >
                {t("legal.langEn", "English")}
              </button>
            </div>
          </div>

          {/* Document type tag */}
          <div className={styles.heroTag} aria-hidden="true">
            <span className={styles.heroTagPulse} />
            {doc.badge}
          </div>

          {/* Title */}
          <h1 className={styles.heroTitle}>{doc.title}</h1>

          {/* Subtitle */}
          {doc.subtitle && (
            <p className={styles.heroSubtitle}>{doc.subtitle}</p>
          )}

          {/* Meta row */}
          <div className={styles.heroMeta}>
            {doc.lastUpdated && (
              <>
                <span className={styles.metaItem}>
                  <IconCalendar />
                  {t("legal.lastUpdated")}: <strong>{doc.lastUpdated}</strong>
                </span>
                <span className={styles.metaDivider} aria-hidden="true">·</span>
              </>
            )}
            <span className={styles.metaItem}>
              <strong>{doc.sections.length}</strong>&nbsp;{t("legal.articles")}
            </span>
          </div>

          {/* Related pages */}
          {siblingPages.length > 0 && (
            <div className={styles.relatedRow}>
              <span className={styles.relatedLabel}>{t("legal.legalDocs")}:</span>
              <div className={styles.relatedLinks}>
                {siblingPages.map((p) => {
                  const isCurrent = isCurrentSibling(p.href);
                  return (
                    <Link
                      key={p.href}
                      href={`/${lang}${p.href}`}
                      className={`${styles.relatedLink} ${isCurrent ? styles.relatedLinkCurrent : ""}`}
                      aria-current={isCurrent ? "page" : undefined}
                    >
                      <IconFileText />
                      <span>{t(p.titleKey)}</span>
                      {!isCurrent && <IconArrowUpRight isRtl={isRtl} />}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </header>

      {/* ══════════════ MOBILE TOC DROPDOWN ══════════════ */}
      <div className={styles.mobileToc} ref={tocDropdownRef}>
        <div className={styles.mobileTocInner}>
          <button
            className={styles.mobileTocBtn}
            onClick={() => setTocOpen((v) => !v)}
            aria-expanded={tocOpen}
          >
            <span className={styles.mobileTocBtnLabel}>{t("legal.jumpTo")}</span>
            <span className={styles.mobileTocBtnSection}>
              {activeSection
                ? `${String(activeSection.num).padStart(2, "0")} · ${activeSection.title}`
                : "—"}
            </span>
            <span className={`${styles.mobileTocChevron} ${tocOpen ? styles.mobileTocChevronOpen : ""}`}>
              <IconChevronDown />
            </span>
          </button>

          {tocOpen && (
            <div className={styles.mobileTocDropdown}>
              {doc.sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`${styles.mobileTocItem} ${activeId === s.id ? styles.mobileTocItemActive : ""}`}
                  onClick={() => setTocOpen(false)}
                >
                  <span className={styles.mobileTocNum}>{String(s.num).padStart(2, "0")}</span>
                  <span>{s.title}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════ BODY ══════════════ */}
      <div className={styles.body}>
        <div className={styles.bodyInner}>

          {/* ── Sidebar ── */}
          <aside className={styles.sidebar} aria-label="Table of Contents">
            <div className={styles.sidebarSticky}>
              <p className={styles.tocHeading}>{t("legal.onThisPage")}</p>
              <nav className={styles.tocNav}>
                {doc.sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className={`${styles.tocItem} ${activeId === s.id ? styles.tocItemActive : ""}`}
                  >
                    <span className={styles.tocItemNum}>{String(s.num).padStart(2, "0")}</span>
                    <span className={styles.tocItemTitle}>{s.title}</span>
                  </a>
                ))}
              </nav>

              {siblingPages.length > 0 && (
                <div className={styles.sidebarDocs}>
                  <p className={styles.sidebarDocsLabel}>{t("legal.legalDocs")}</p>
                  {siblingPages.map((p) => {
                    const isCurrent = isCurrentSibling(p.href);
                    return (
                      <Link
                        key={p.href}
                        href={`/${lang}${p.href}`}
                        className={`${styles.sidebarDocLink} ${isCurrent ? styles.sidebarDocLinkCurrent : ""}`}
                        aria-current={isCurrent ? "page" : undefined}
                      >
                        <IconFileText />
                        <span>{t(p.titleKey)}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          {/* ── Main content ── */}
          <main className={styles.content}>

            {doc.sections.map((section) => (
              <article
                key={section.id}
                id={section.id}
                className={styles.card}
              >
                <div className={styles.cardHead}>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardNum}>
                      {String(section.num).padStart(2, "0")}
                    </span>
                    <span className={styles.cardMetaDot} aria-hidden="true">·</span>
                    <span className={styles.cardLabel}>{section.label}</span>
                  </div>
                  <h2 className={styles.cardTitle}>{section.title}</h2>
                </div>

                <div className={styles.cardBody}>
                  {section.body.split("\n\n").map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </article>
            ))}

            {/* ── Contact CTA ── */}
            <div className={styles.cta}>
              <div className={styles.ctaGlow} aria-hidden="true" />
              <div className={styles.ctaContent}>
                <h3 className={styles.ctaTitle}>{t("legal.contactTitle")}</h3>
                <p className={styles.ctaDesc}>{t("legal.contactDesc")}</p>
              </div>
              <div className={styles.ctaActions}>
                <a href={CONTACT_EMAIL} className={`${styles.ctaBtn} ${styles.ctaBtnPrimary}`}>
                  <IconEmail />
                  {t("legal.contactEmail")}
                </a>
                <a
                  href={CONTACT_WA}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.ctaBtn} ${styles.ctaBtnGhost}`}
                >
                  <IconWhatsApp />
                  {t("legal.contactWA")}
                </a>
              </div>
            </div>

          </main>
        </div>
      </div>

      {/* ── Back to top button ── */}
      <button
        className={`${styles.backToTop} ${showBackToTop ? styles.backToTopVisible : ""}`}
        onClick={scrollToTop}
        aria-label={t("legal.backToTop")}
        title={t("legal.backToTop")}
      >
        <IconArrowUp />
      </button>

    </div>
  );
}
