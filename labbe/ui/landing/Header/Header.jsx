"use client";
import React, { useState, useEffect } from "react";
import styles from "./header.module.css";
import Button from "../../commen/button/Button";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import LangToggle from "../../common/LangToggle";
import { cookieUtils } from "@/utils/cookieUtils";

// Role → dashboard path. Mirrors middleware.js getRedirectPath().
const dashboardPathForRole = (role) => {
  if (
    role === "super_admin" ||
    role === "admin" ||
    role === "moderator" ||
    role === "whitelabel_admin" ||
    role === "whitelabel_moderator"
  ) {
    return "/admin-dash";
  }
  if (role === "vendor") return "/vendor-dashboard";
  if (role === "host") return "/host";
  return null;
};

const Header = ({ lang = "ar" }) => {
  const { t } = useTranslation("landing");
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Defer reading the cookie until after mount so SSR and first client render
  // match (cookies aren't available on the server here). The component briefly
  // renders the logged-out state, then swaps if a session is detected.
  const [dashboardHref, setDashboardHref] = useState(null);
  useEffect(() => {
    const role = cookieUtils.getCookie("userType");
    const path = dashboardPathForRole(role);
    if (path) setDashboardHref(`/${lang}${path}`);
  }, [lang]);

  // Anchors must resolve from any page, not only landing — prefix with the
  // landing route so clicking "Pricing" from /market-place jumps to /ar#pricing.
  const isLanding = pathname === `/${lang}` || pathname === "/";
  const anchor = (id) => (isLanding ? `#${id}` : `/${lang}#${id}`);

  const menuItems = [
    { label: t("header.nav.home"),        href: `/${lang}`,        active: isLanding },
    { label: t("header.nav.features"),    href: anchor("features") },
    { label: t("header.nav.pricing"),     href: anchor("pricing") },
    { label: t("header.nav.invitations"), href: anchor("invitations") },
    { label: t("header.nav.store"),       href: `/${lang}/market-place`, active: pathname?.includes("/market-place") },
  ];

  const renderAuthCtas = ({ onClick } = {}) =>
    dashboardHref ? (
      <Link href={dashboardHref} onClick={onClick} className={styles.mobileBtnLink}>
        <Button title={t("header.dashboard")} variant="primary" className={styles.headerBtnLogin} />
      </Link>
    ) : (
      <>
        <Link href={`/${lang}/login`} onClick={onClick} className={styles.mobileBtnLink}>
          <Button title={t("header.login")} variant="primary" className={styles.headerBtnLogin} />
        </Link>
        <Link href={`/${lang}/signup`} onClick={onClick} className={styles.mobileBtnLink}>
          <Button title={t("header.signup")} variant="secondary" className={styles.headerBtnSignup} />
        </Link>
      </>
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
          <LangToggle className={styles.langSwitcher} />
          {renderAuthCtas()}
        </div>

        {/* Mobile right: lang toggle + hamburger */}
        <div className={styles.mobileRight}>
          <LangToggle className={styles.langSwitcher} />
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
          {renderAuthCtas({ onClick: () => setMenuOpen(false) })}
        </div>
      </div>
    </header>
  );
};

export default Header;
