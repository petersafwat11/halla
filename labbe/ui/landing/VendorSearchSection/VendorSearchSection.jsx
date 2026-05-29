"use client";
import React from "react";
import styles from "./vendorSearchSection.module.css";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import useCarouselSnap from "../_shared/useCarouselSnap";
import CarouselDots from "../_shared/CarouselDots";

const VENDOR_RATINGS = [4.9, 4.8, 4.7];
const VENDOR_REVIEWS = [127, 89, 64];
const VENDOR_IMAGES = [
  "https://api.builder.io/api/v1/image/assets/TEMP/b96180b244f60315c86efc4ac4c36be98d32aa0d?width=919",
  "https://api.builder.io/api/v1/image/assets/TEMP/b96180b244f60315c86efc4ac4c36be98d32aa0d?width=919",
  "https://api.builder.io/api/v1/image/assets/TEMP/b96180b244f60315c86efc4ac4c36be98d32aa0d?width=919",
];

const GAP = 14;

const VendorSearchSection = ({ lang = "ar" }) => {
  const { t } = useTranslation("landing");
  const isAr = lang === "ar";
  const vendors = t("vendorSearch.vendors", { returnObjects: true });
  const { trackRef, idx, maxIdx, scrollToIdx, goPrev, goNext, handleScroll } = useCarouselSnap({
    gap: GAP,
    totalItems: vendors.length,
  });

  return (
    <section id="store" className={styles.vendorSearchSection}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t("vendorSearch.title")}</h2>
          <p className={styles.description}>{t("vendorSearch.description")}</p>
        </div>

        <div className={styles.carouselWrapper}>
          <div className={styles.vendorCards} ref={trackRef} onScroll={handleScroll}>
            {vendors.map((vendor, index) => (
              <div key={index} className={styles.vendorCard}>
                <div className={styles.vendorImage}>
                  <img src={VENDOR_IMAGES[index]} alt={vendor.name} />
                  <div className={styles.rating}>
                    <span className={styles.ratingCount}>
                      ({VENDOR_REVIEWS[index]} {t("vendorSearch.reviewsSuffix")})
                    </span>
                    <span className={styles.ratingValue}>{VENDOR_RATINGS[index]}</span>
                    <Image src="/svg/star.svg" alt="star" width={12} height={12} />
                  </div>
                </div>

                <div className={styles.vendorInfo}>
                  <h3 className={styles.vendorName}>{vendor.name}</h3>

                  <div className={styles.vendorLocation}>
                    <Image src="/svg/location.svg" alt="location" width={16} height={16} />
                    <span>{vendor.location}</span>
                  </div>

                  <div className={styles.vendorTags}>
                    {vendor.tags.map((tag, tagIndex) => (
                      <span key={tagIndex} className={styles.tag}>{tag}</span>
                    ))}
                  </div>

                  <div className={styles.vendorFooter}>
                    <span className={styles.vendorPrice}>{vendor.price}</span>
                    <button className={styles.callButton}>
                      <span>{t("vendorSearch.callBtn")}</span>
                      <Image src="/svg/call.svg" alt="call" width={12} height={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <CarouselDots
            idx={idx}
            maxIdx={maxIdx}
            onChange={scrollToIdx}
            onPrev={goPrev}
            onNext={goNext}
            isAr={isAr}
            classes={{
              controls: styles.controls,
              ctrlBtn: styles.ctrlBtn,
              dots: styles.dots,
              dot: styles.dot,
              dotActive: styles.dotActive,
            }}
          />
        </div>

        <button className={styles.moreButton}>{t("vendorSearch.moreBtn")}</button>
      </div>
    </section>
  );
};

export default VendorSearchSection;
