"use client";
import React from "react";
import styles from "./footer.module.css";
import Image from "next/image";
import Link from "next/link";
import {
  IoLogoWhatsapp,
  IoLogoTwitter,
  IoLogoInstagram,
  IoLogoYoutube,
  IoLogoSnapchat,
} from "react-icons/io";
import AppStoreButtons from "../../commen/AppStoreButtons/AppStoreButtons";
import { useTranslation } from "react-i18next";

const Footer = ({ lang = "ar" }) => {
  const { t } = useTranslation("landing");
  const helpLinks = t("footer.helpLinks", { returnObjects: true });
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.contactSection}>
          <h3 className={styles.sectionTitle}>{t("footer.contactTitle")}</h3>
          <div className={styles.contactInfo}>
            <a href="tel:+966552619282" className={styles.contactLink}>
              <Image src="/svg/phone.svg" alt="phone" width={18} height={18} className={styles.contactIcon} />
              <span dir="ltr" style={{ unicodeBidi: "embed", display: "inline-block" }}>+966 55 261 9282</span>
            </a>

            <a href="mailto:support@halaa.net" className={styles.contactLink}>
              <Image src="/svg/email.svg" alt="email" width={18} height={18} className={styles.contactIcon} />
              <span>support@halaa.net</span>
            </a>

            <address className={styles.addressLink}>
              <Image
                src="/svg/location.svg"
                alt="location"
                width={18}
                height={18}
                className={styles.contactIcon}
              />
              <span>شارع المتحف - جدة - الرمز البريدي 23326</span>
            </address>

            <div className={styles.socialLinks}>
              <a href="#" className={styles.socialIcon} aria-label="WhatsApp">
                <IoLogoWhatsapp />
              </a>
              <a href="#" className={styles.socialIcon} aria-label="Twitter">
                <IoLogoTwitter />
              </a>
              <a href="#" className={styles.socialIcon} aria-label="Instagram">
                <IoLogoInstagram />
              </a>
              <a href="#" className={styles.socialIcon} aria-label="YouTube">
                <IoLogoYoutube />
              </a>
              <a href="#" className={styles.socialIcon} aria-label="Snapchat">
                <IoLogoSnapchat />
              </a>
            </div>
          </div>
        </div>

        <div className={styles.helpSection}>
          <h3 className={styles.sectionTitle}>{t("footer.helpTitle")}</h3>
          <nav className={styles.linksList}>
            {Array.isArray(helpLinks) && helpLinks.map((link, index) => (
              <Link key={index} href={`/${lang}${link.href}`} className={styles.footerLink}>
                <Image
                  src="/svg/page-arrow.svg"
                  alt="arrow"
                  width={14}
                  height={14}
                  className={styles.footerLinkArrow}
                />
                <span>{link.name}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className={styles.downloadSection}>
          <div className={styles.downloadContent}>
            <h3 className={styles.sectionTitle}>{t("footer.downloadTitle")}</h3>
            <p className={styles.downloadDescription}>
              {t("footer.description")}
            </p>

            <div className={styles.downloadOptions}>
              <AppStoreButtons lang={lang} direction="row" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className={styles.bottomBar}>
        <span className={styles.copyright}>{t("footer.copyright")}</span>
      </div>
    </footer>
  );
};

export default Footer;
