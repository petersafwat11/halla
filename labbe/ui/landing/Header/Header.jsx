"use client";
import React, { useState } from "react";
import styles from "./header.module.css";
import Button from "../../commen/button/Button";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import LangToggle from "../../common/LangToggle";

const Header = ({ lang = "ar" }) => {
  const { t } = useTranslation("landing");
  const [menuOpen, setMenuOpen] = useState(false);

  const menuItems = [
    { label: t("header.nav.home"),        href: "#home",        active: true },
    { label: t("header.nav.features"),    href: "#features" },
    { label: t("header.nav.pricing"),     href: "#pricing" },
    { label: t("header.nav.invitations"), href: "#invitations" },
    { label: t("header.nav.store"),       href: "#store" },
  ];

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
          <Link href={`/${lang}/login`}>
            <Button title={t("header.login")} variant="primary" className={styles.headerBtnLogin} />
          </Link>
          <Link href={`/${lang}/signup`}>
            <Button title={t("header.signup")} variant="secondary" className={styles.headerBtnSignup} />
          </Link>
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
