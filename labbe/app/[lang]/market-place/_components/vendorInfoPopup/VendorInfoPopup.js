"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import {
  FiX,
  FiStar,
  FiMapPin,
  FiGlobe,
  FiMail,
  FiPhone,
  FiMessageCircle,
} from "react-icons/fi";
import styles from "./vendorInfoPopup.module.css";

const VendorInfoPopup = ({ isOpen, onClose, vendor }) => {
  const { t } = useTranslation("marketplace");
  const popupRef = useRef(null);
  const [heroError, setHeroError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setHeroError(false);
    setLogoError(false);

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen || !vendor) return null;

  const {
    brandName,
    description,
    logo,
    coverImage,
    portfolio = [],
    rating,
    reviewCount,
    location,
    email,
    mobile,
    socialLinks = {},
    services = [],
  } = vendor;

  const hasRating = rating != null && Number(rating) > 0;
  const reviewCountNum = Number(reviewCount) || 0;
  const hasHero = !!coverImage && !heroError;
  const hasLogo = !!logo && !logoError;
  const heroInitial = (brandName || "?").trim().charAt(0).toUpperCase();
  const logoInitial = (brandName || "?").trim().charAt(0).toUpperCase();
  const hasPortfolio = Array.isArray(portfolio) && portfolio.length > 0;
  const hasServices = Array.isArray(services) && services.length > 0;
  const hasContact = location || socialLinks.website || email || mobile;

  const phoneDigits = mobile ? String(mobile).replace(/[^\d]/g, "") : "";
  const whatsappHref = phoneDigits ? `https://wa.me/${phoneDigits}` : null;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="vendor-info-title"
    >
      <div className={styles.popup} ref={popupRef}>
        {/* ────────── HERO ────────── */}
        <div className={styles.hero}>
          {hasHero ? (
            <Image
              src={coverImage}
              alt={brandName || ""}
              fill
              sizes="(max-width: 768px) 100vw, 600px"
              style={{ objectFit: "cover" }}
              onError={() => setHeroError(true)}
            />
          ) : (
            <div className={styles.heroFallback} aria-hidden="true">
              <span className={styles.heroFallbackInitial}>{heroInitial}</span>
            </div>
          )}
          <div className={styles.heroOverlay} />

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label={t("vendor.close", "Close")}
          >
            <FiX />
          </button>

          <div className={styles.heroContent}>
            <div className={styles.heroLogoWrap}>
              {hasLogo ? (
                <Image
                  src={logo}
                  alt=""
                  width={64}
                  height={64}
                  className={styles.heroLogo}
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className={styles.heroLogoFallback}>{logoInitial}</span>
              )}
            </div>
            <h2 id="vendor-info-title" className={styles.heroTitle}>
              {brandName}
            </h2>
            <div className={styles.heroMeta}>
              {hasRating && (
                <span className={styles.heroMetaItem}>
                  <FiStar className={styles.starIcon} />
                  <strong>{Number(rating).toFixed(1)}</strong>
                  {reviewCountNum > 0 && (
                    <span className={styles.heroMetaDim}>
                      ({reviewCountNum})
                    </span>
                  )}
                </span>
              )}
              {location && (
                <span className={styles.heroMetaItem}>
                  <FiMapPin />
                  <span>{location}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ────────── BODY ────────── */}
        <div className={styles.content}>
          {/* About Vendor */}
          {description && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>
                {t("vendor.aboutVendor", "About Vendor")}
              </h3>
              <p className={styles.aboutText}>{description}</p>
            </section>
          )}

          {/* Portfolio Gallery */}
          {hasPortfolio && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>
                {t("vendor.portfolio", "Portfolio")}
              </h3>
              <div className={styles.portfolioGallery}>
                {portfolio.map((img, idx) => (
                  <div key={idx} className={styles.portfolioItem}>
                    <Image
                      src={img}
                      alt={`${t("vendor.portfolio", "Portfolio")} ${idx + 1}`}
                      fill
                      sizes="120px"
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Services */}
          {hasServices && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>
                {t("vendor.ourServices", "Our Services")}
              </h3>
              <div className={styles.servicesList}>
                {services.map((svc) => (
                  <div key={svc.id} className={styles.serviceItem}>
                    {svc.image && (
                      <div className={styles.serviceImageWrap}>
                        <Image
                          src={svc.image}
                          alt={svc.name || ""}
                          fill
                          sizes="80px"
                          style={{ objectFit: "cover" }}
                        />
                      </div>
                    )}
                    <div className={styles.serviceDetails}>
                      <h4 className={styles.serviceName}>{svc.name}</h4>
                      {svc.description && (
                        <p className={styles.serviceDesc}>{svc.description}</p>
                      )}
                      {svc.price != null && (
                        <span className={styles.servicePrice}>
                          {svc.price} {svc.currency || t("currency")}
                        </span>
                      )}
                    </div>
                    {mobile && (
                      <a
                        className={styles.serviceInquiry}
                        href={`tel:${mobile}`}
                        aria-label={t("card.callNow")}
                      >
                        <FiPhone />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Contact */}
          {hasContact && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>
                {t("vendor.contactInfo", "Contact Information")}
              </h3>
              <div className={styles.contactList}>
                {location && (
                  <div className={styles.contactRow}>
                    <span className={styles.contactIcon}>
                      <FiMapPin />
                    </span>
                    <span className={styles.contactText}>{location}</span>
                  </div>
                )}
                {socialLinks.website && (
                  <a
                    className={styles.contactRow}
                    href={socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className={styles.contactIcon}>
                      <FiGlobe />
                    </span>
                    <span className={styles.contactText}>{socialLinks.website}</span>
                  </a>
                )}
                {email && (
                  <a className={styles.contactRow} href={`mailto:${email}`}>
                    <span className={styles.contactIcon}>
                      <FiMail />
                    </span>
                    <span className={styles.contactText}>{email}</span>
                  </a>
                )}
                {mobile && (
                  <a className={styles.contactRow} href={`tel:${mobile}`}>
                    <span className={styles.contactIcon}>
                      <FiPhone />
                    </span>
                    <span
                      className={styles.contactText}
                      dir="ltr"
                      style={{ unicodeBidi: "embed", display: "inline-block" }}
                    >
                      {mobile}
                    </span>
                  </a>
                )}
              </div>
            </section>
          )}
        </div>

        {/* ────────── STICKY CTA FOOTER ────────── */}
        {mobile && (
          <div className={styles.ctaFooter}>
            {whatsappHref && (
              <a
                className={`${styles.ctaButton} ${styles.ctaButtonWhatsapp}`}
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FiMessageCircle />
                <span>{t("vendor.whatsapp", "WhatsApp")}</span>
              </a>
            )}
            <a
              className={`${styles.ctaButton} ${styles.ctaButtonPrimary}`}
              href={`tel:${mobile}`}
            >
              <FiPhone />
              <span>{t("card.callNow")}</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorInfoPopup;
