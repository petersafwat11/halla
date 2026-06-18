"use client";
import React, { useState } from "react";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { FiPhone, FiStar, FiMapPin } from "react-icons/fi";
import styles from "./card.module.css";

const MAX_VISIBLE_TAGS = 3;

const ServiceCard = ({ service }) => {
  const { t } = useTranslation("marketplace");
  const [imageError, setImageError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const {
    image,
    logo,
    rating = 0,
    reviewsCount = 0,
    title = "",
    location = "",
    tags = [],
    price = "",
    vendorName = "",
    onCallClick,
  } = service || {};

  const hasImage = !!image && !imageError;
  const hasLogo = !!logo && !logoError;
  const hasRating = rating > 0;
  const initial = (title || vendorName || "?").trim().charAt(0).toUpperCase();
  const logoInitial = (title || vendorName || "?").trim().charAt(0).toUpperCase();
  const visibleTags = tags.slice(0, MAX_VISIBLE_TAGS);
  const extraTagsCount = tags.length - visibleTags.length;

  return (
    <article className={styles.card}>
      <div className={styles.imageContainer}>
        {hasImage ? (
          <Image
            src={image}
            alt={title}
            className={styles.image}
            fill
            sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 320px"
            style={{ objectFit: "cover" }}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={styles.imageFallback} aria-hidden="true">
            <span className={styles.imageFallbackInitial}>{initial}</span>
            <div className={styles.imageFallbackPattern} />
          </div>
        )}

        <div className={styles.logoBadge}>
          {hasLogo ? (
            <Image
              src={logo}
              alt=""
              width={40}
              height={40}
              className={styles.logoBadgeImg}
              onError={() => setLogoError(true)}
            />
          ) : (
            <span className={styles.logoBadgeFallback}>{logoInitial}</span>
          )}
        </div>

        {hasRating && (
          <div className={styles.ratingBadge}>
            <FiStar className={styles.ratingIcon} aria-hidden="true" />
            <span className={styles.ratingValue}>{rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      <div className={styles.content}>
        <div className={styles.heading}>
          <h3 className={styles.title}>{title}</h3>
        </div>

        {location && (
          <div className={styles.locationContainer}>
            <FiMapPin className={styles.locationIcon} aria-hidden="true" />
            <span className={styles.location}>{location}</span>
          </div>
        )}

        {visibleTags.length > 0 && (
          <div className={styles.tagsContainer}>
            {visibleTags.map((tag, index) => (
              <span key={index} className={styles.tag}>
                {tag}
              </span>
            ))}
            {extraTagsCount > 0 && (
              <span className={styles.tagMore}>+{extraTagsCount}</span>
            )}
          </div>
        )}

        <div className={styles.footer}>
          {price ? (
            <span className={styles.price}>{price}</span>
          ) : (
            <span className={styles.priceOnRequest}>{t("card.priceOnRequest")}</span>
          )}
          <button
            className={styles.callButton}
            onClick={onCallClick}
            aria-label={t("card.callNow")}
          >
            <FiPhone className={styles.callIcon} aria-hidden="true" />
            <span>{t("card.callNow")}</span>
          </button>
        </div>
      </div>
    </article>
  );
};

export default ServiceCard;
