"use client";
import React, { useState } from "react";
import styles from "./header.module.css";
import Button from "../../commen/button/Button";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { usePathname } from "next/navigation";

const Header = ({ lang = "ar" }) => {
  const { t } = useTranslation("landing");
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const otherLang = lang === "ar" ? "en" : "ar";
  const switchHref = pathname ? pathname.replace(`/${lang}`, `/${otherLang}`) : `/${otherLang}`;
  const switchLabel = lang === "ar" ? "EN" : "AR";

  const menuItems = [
    { label: t("header.nav.home"),        href: "#home",        active: true },
    { label: t("header.nav.features"),    href: "#features" },
    { label: t("header.nav.invitations"), href: "#invitations" },
    { label: t("header.nav.pricing"),     href: "#pricing" },
    { label: t("header.nav.joinNow"),     href: "#join" },
    { label: t("header.nav.store"),       href: "#store" },
    { label: t("header.nav.reviews"),     href: "#reviews" },
  ];

  const globeIcon = (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );

  return (
    <header className={styles.header}>
      <div className={styles.container}>

        {/* Logo */}
        <div className={styles.logo}>
          <Image src="/logo.png" alt="Logo" width={50} height={50} className={styles.logoImg} />
        </div>

        {/* Desktop centered nav */}
        <nav className={styles.nav}>
          <ul className={styles.menuItems}>
            {menuItems.map((item, index) => (
              <li key={index}>
                <a href={item.href} className={item.active ? styles.active : ""}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Desktop right: lang toggle + buttons */}
        <div className={styles.buttonsSection}>
          <Link href={switchHref} className={styles.langSwitcher}>
            {globeIcon}
            <span>{switchLabel}</span>
          </Link>
          <Link href={`/${lang}/login`}>
            <Button title={t("header.login")} variant="primary" className={styles.headerBtnLogin} />
          </Link>
          <Link href={`/${lang}/signup`}>
            <Button title={t("header.signup")} variant="secondary" className={styles.headerBtnSignup} />
          </Link>
        </div>

        {/* Mobile right: lang toggle + hamburger */}
        <div className={styles.mobileRight}>
          <Link href={switchHref} className={styles.langSwitcher}>
            {globeIcon}
            <span>{switchLabel}</span>
          </Link>
          <button
            className={styles.hamburger}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <span className={`${styles.bar} ${menuOpen ? styles.barOpen1 : ""}`} />
            <span className={`${styles.bar} ${menuOpen ? styles.barOpen2 : ""}`} />
            <span className={`${styles.bar} ${menuOpen ? styles.barOpen3 : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      <div className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ""}`}>
        <ul className={styles.mobileMenuItems}>
          {menuItems.map((item, index) => (
            <li key={index}>
              <a
                href={item.href}
                className={item.active ? styles.active : ""}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
        <div className={styles.mobileButtons}>
          <Link href={`/${lang}/login`} onClick={() => setMenuOpen(false)} className={styles.mobileBtnLink}>
            <Button title={t("header.login")} variant="primary" className={styles.headerBtnLogin} />
          </Link>
          <Link href={`/${lang}/signup`} onClick={() => setMenuOpen(false)} className={styles.mobileBtnLink}>
            <Button title={t("header.signup")} variant="secondary" className={styles.headerBtnSignup} />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
