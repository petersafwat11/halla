"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, MapPin, Star } from "lucide-react";
import styles from "./card.module.css";

const MAX_VISIBLE_TAGS = 3;

const VendorCard = ({ vendor, href }) => {
  const { t, i18n } = useTranslation("marketplace");
  const [imageError, setImageError] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const categories = vendor?.categories || [];
  const visibleTags = categories.slice(0, MAX_VISIBLE_TAGS);
  const initial = (vendor?.brandName || "?").trim().charAt(0).toUpperCase();
  const hasRating = Number(vendor?.rating) > 0;
  const description = vendor?.tagline || vendor?.shortDescription;
  const ArrowIcon = i18n.language === "ar" ? ArrowLeft : ArrowRight;

  return (
    <article className={styles.card}>
      <Link href={href} className={styles.imageContainer} aria-label={t("card.viewProfileFor", { name: vendor.brandName })}>
        {(vendor.presentationImage || vendor.coverImage) && !imageError ? (
          <Image
            src={vendor.presentationImage || vendor.coverImage}
            alt=""
            fill
            sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 320px"
            className={styles.image}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={styles.imageFallback} aria-hidden="true">
            <span className={styles.imageFallbackInitial}>{initial}</span>
            <div className={styles.imageFallbackPattern} />
          </div>
        )}

        <div className={styles.logoBadge}>
          {vendor.logo && !logoError ? (
            <Image src={vendor.logo} alt="" width={48} height={48} className={styles.logoBadgeImg} onError={() => setLogoError(true)} />
          ) : (
            <span className={styles.logoBadgeFallback}>{initial}</span>
          )}
        </div>
      </Link>

      <div className={styles.content}>
        <Link href={href} className={styles.titleLink}>
          <h2 className={styles.title}>{vendor.brandName}</h2>
        </Link>
        {description && <p className={styles.description}>{description}</p>}

        <div className={styles.meta}>
          {hasRating && (
            <span className={styles.rating}>
              <Star className={styles.ratingIcon} aria-hidden="true" />
              {Number(vendor.rating).toFixed(1)}
            </span>
          )}
          {vendor.location && (
            <span className={styles.location}>
              <MapPin size={14} aria-hidden="true" />
              <span className={styles.locationText}>{vendor.location}</span>
            </span>
          )}
        </div>

        {visibleTags.length > 0 && (
          <div className={styles.tagsContainer}>
            {visibleTags.map((tag) => <span key={tag} className={styles.tag}>{tag}</span>)}
            {categories.length > visibleTags.length && <span className={styles.tagMore}>+{categories.length - visibleTags.length}</span>}
          </div>
        )}

        <div className={styles.footer}>
          <div className={styles.priceBlock}>
            <span className={styles.priceLabel}>{vendor.startingPrice ? t("vendor.startsFrom") : ""}</span>
            <span className={styles.price}>
              {vendor.startingPrice
                ? `${vendor.startingPrice.amount} ${vendor.startingPrice.currency}`
                : t("card.priceOnRequest")}
            </span>
          </div>
          <Link href={href} className={styles.cta}>
            <span>{t("card.viewProfile")}</span>
            <ArrowIcon size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
};

export default VendorCard;
