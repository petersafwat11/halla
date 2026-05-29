"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import {
  FiX,
  FiStar,
  FiMapPin,
  FiClock,
  FiGlobe,
  FiMail,
  FiPhone,
  FiCheck,
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
    name,
    image,
    companyName,
    logo,
    rating,
    reviewCount,
    duration,
    price,
    currency,
    included,
    location,
    website,
    email,
    phone,
  } = vendor;

  const hasIncluded = Array.isArray(included) && included.length > 0;
  const hasContact = location || website || email || phone;
  const hasRating = rating != null && Number(rating) > 0;
  const reviewCountNum = Number(reviewCount) || 0;
  const hasHero = !!image && !heroError;
  const hasLogo = !!logo && !logoError;
  const heroInitial = (name || companyName || "?").trim().charAt(0).toUpperCase();
  const logoInitial = (companyName || name || "?").trim().charAt(0).toUpperCase();

  // Normalize phone for WhatsApp (digits only, with leading country code)
  const phoneDigits = phone ? String(phone).replace(/[^\d]/g, "") : "";
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
              src={image}
              alt={name || ""}
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
            <h2 id="vendor-info-title" className={styles.heroTitle}>
              {name}
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
          {/* Vendor identity row */}
          {(companyName || logo) && (
            <div className={styles.vendorCard}>
              <div className={styles.vendorLogo}>
                {hasLogo ? (
                  <Image
                    src={logo}
                    alt=""
                    width={56}
                    height={56}
                    style={{ objectFit: "contain" }}
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <span className={styles.vendorLogoFallback}>
                    {logoInitial}
                  </span>
                )}
              </div>
              <div className={styles.vendorMeta}>
                <span className={styles.vendorLabel}>
                  {t("vendor.providedBy", "By")}
                </span>
                <span className={styles.vendorName}>
                  {companyName || name}
                </span>
              </div>
            </div>
          )}

          {/* Meta chips: price + duration */}
          {(price || duration) && (
            <div className={styles.metaGrid}>
              {price && (
                <div className={styles.metaChip}>
                  <span className={styles.metaChipLabel}>
                    {t("vendor.price", "Price")}
                  </span>
                  <span className={styles.metaChipValue}>
                    {price} {currency || t("currency")}
                  </span>
                </div>
              )}
              {duration && (
                <div className={styles.metaChip}>
                  <span className={styles.metaChipLabel}>
                    <FiClock className={styles.metaChipIcon} />
                    {t("vendor.serviceDuration")}
                  </span>
                  <span className={styles.metaChipValue}>{duration}</span>
                </div>
              )}
            </div>
          )}

          {/* What's included */}
          {hasIncluded && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>
                {t("vendor.whatsIncluded")}
              </h3>
              <ul className={styles.includedList}>
                {included.map((item, index) => (
                  <li key={index} className={styles.includedItem}>
                    <span className={styles.includedCheck} aria-hidden="true">
                      <FiCheck />
                    </span>
                    <span className={styles.includedText}>{item}</span>
                  </li>
                ))}
              </ul>
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
                {website && (
                  <a
                    className={styles.contactRow}
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className={styles.contactIcon}>
                      <FiGlobe />
                    </span>
                    <span className={styles.contactText}>{website}</span>
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
                {phone && (
                  <a className={styles.contactRow} href={`tel:${phone}`}>
                    <span className={styles.contactIcon}>
                      <FiPhone />
                    </span>
                    <span
                      className={styles.contactText}
                      dir="ltr"
                      style={{ unicodeBidi: "embed", display: "inline-block" }}
                    >
                      {phone}
                    </span>
                  </a>
                )}
              </div>
            </section>
          )}
        </div>

        {/* ────────── STICKY CTA FOOTER ────────── */}
        {phone && (
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
              href={`tel:${phone}`}
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
