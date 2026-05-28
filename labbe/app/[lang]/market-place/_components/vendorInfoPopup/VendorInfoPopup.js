"use client";
import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import styles from "./vendorInfoPopup.module.css";

const VendorInfoPopup = ({ isOpen, onClose, vendor }) => {
  const { t } = useTranslation("marketplace");
  const popupRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

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

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="vendor-info-title"
    >
      <div className={styles.popup} ref={popupRef}>
        <div className={styles.header}>
          {image && (
            <Image
              src={image}
              alt={name || ""}
              fill
              sizes="(max-width: 768px) 100vw, 600px"
              style={{ objectFit: "cover" }}
            />
          )}
          <div className={styles.headerGradient} />
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label={t("vendor.close", "Close")}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18" stroke="#FFF" strokeWidth="2" strokeLinecap="round" />
              <path d="M6 6L18 18" stroke="#FFF" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <h2 id="vendor-info-title" className={styles.headerTitle}>
            {name}
          </h2>
        </div>

        <div className={styles.content}>
          {duration ? (
            <div className={styles.infoCard}>
              <div className={styles.infoHeader}>
                <span className={`${styles.iconBadge} ${styles.iconBadgeBlue}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="#2563EB" strokeWidth="2" />
                    <path d="M12 7v5l3 2" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
                <span className={styles.infoTitle}>{t("vendor.serviceDuration")}</span>
              </div>
              <div className={styles.infoValue}>{duration}</div>
            </div>
          ) : null}

          {price ? (
            <div className={styles.infoCard}>
              <div className={styles.infoHeader}>
                <span className={`${styles.iconBadge} ${styles.iconBadgeYellow}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 1v22M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"
                      stroke="#D97706"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <span className={styles.infoTitle}>{t("vendor.price", "Price")}</span>
              </div>
              <div className={styles.infoValue}>
                {price} {currency || t("currency")}
              </div>
            </div>
          ) : null}

          {hasIncluded ? (
            <div className={styles.includedCard}>
              <div className={styles.includedTitle}>{t("vendor.whatsIncluded")}</div>
              <ul className={styles.includedList}>
                {included.map((item, index) => (
                  <li key={index} className={styles.includedItem}>
                    <span className={styles.bullet} />
                    <span className={styles.includedText}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {(companyName || logo || hasRating) && (
            <div className={styles.vendorCard}>
              <div className={styles.vendorInfo}>
                <div className={styles.vendorDetails}>
                  <div className={styles.vendorName}>
                    {companyName || name || t("vendor.defaultName", "")}
                  </div>
                  {(hasRating || reviewCountNum > 0) && (
                    <div className={styles.vendorStats}>
                      {reviewCountNum > 0 && (
                        <span className={styles.statValue}>
                          ({reviewCountNum} {t("card.users")})
                        </span>
                      )}
                      {hasRating && (
                        <span className={styles.statLabel}>{Number(rating).toFixed(1)}</span>
                      )}
                    </div>
                  )}
                </div>
                {logo && (
                  <div className={styles.vendorLogo}>
                    <Image src={logo} alt={companyName || ""} width={48} height={48} style={{ objectFit: "contain" }} />
                  </div>
                )}
              </div>
            </div>
          )}

          {hasContact && (
            <div className={styles.contactSection}>
              <div className={styles.contactTitle}>{t("vendor.contactInfo", "Contact Information")}</div>
              <div className={styles.contactList}>
                {location && (
                  <div className={styles.contactItem}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 22s8-7.58 8-13a8 8 0 10-16 0c0 5.42 8 13 8 13z"
                        stroke="#737373"
                        strokeWidth="2"
                      />
                      <circle cx="12" cy="9" r="3" stroke="#737373" strokeWidth="2" />
                    </svg>
                    <span className={styles.contactText}>{location}</span>
                  </div>
                )}
                {website && (
                  <a className={styles.contactItem} href={website} target="_blank" rel="noopener noreferrer">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="#737373" strokeWidth="2" />
                      <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" stroke="#737373" strokeWidth="2" />
                    </svg>
                    <span className={styles.contactText}>{website}</span>
                  </a>
                )}
                {email && (
                  <a className={styles.contactItem} href={`mailto:${email}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="5" width="18" height="14" rx="2" stroke="#737373" strokeWidth="2" />
                      <path d="M3 7l9 7 9-7" stroke="#737373" strokeWidth="2" />
                    </svg>
                    <span className={styles.contactText}>{email}</span>
                  </a>
                )}
                {phone && (
                  <a className={styles.contactItem} href={`tel:${phone}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.37 1.9.72 2.8a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.9.35 1.84.59 2.8.72A2 2 0 0122 16.92z"
                        stroke="#737373"
                        strokeWidth="2"
                      />
                    </svg>
                    <span className={styles.contactText} dir="ltr" style={{ unicodeBidi: "embed", display: "inline-block" }}>{phone}</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {phone && (
            <div className={styles.footer}>
              <a className={styles.callButton} href={`tel:${phone}`}>
                {t("card.callNow")}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorInfoPopup;
