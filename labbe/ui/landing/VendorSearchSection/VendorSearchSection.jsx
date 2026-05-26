"use client";
import React, { useState, useRef, useEffect } from "react";
import styles from "./vendorSearchSection.module.css";
import Image from "next/image";
import { useTranslation } from "react-i18next";

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
  const trackRef = useRef(null);
  const [idx, setIdx] = useState(0);
  const throttleRef = useRef(false);
  const maxIdx = vendors.length - 1;

  const scrollToIdx = (i) => {
    const el = trackRef.current;
    if (!el) return;
    const cardW = el.firstElementChild?.offsetWidth || 0;
    el.scrollTo({ left: i * (cardW + GAP), behavior: "smooth" });
    setIdx(i);
  };

  const prev = () => scrollToIdx(Math.max(0, idx - 1));
  const next = () => scrollToIdx(Math.min(maxIdx, idx + 1));

  const handleScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const cardW = el.firstElementChild?.offsetWidth || 0;
    const step = cardW + GAP;
    if (step > 0) setIdx(Math.min(Math.max(0, Math.round(el.scrollLeft / step)), maxIdx));
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      if (throttleRef.current) return;
      throttleRef.current = true;
      setTimeout(() => { throttleRef.current = false; }, 420);
      const delta = (e.deltaY || e.deltaX) > 0 ? 1 : -1;
      const cardW = el.firstElementChild?.offsetWidth || 0;
      const step = cardW + GAP;
      const cur = step > 0 ? Math.round(el.scrollLeft / step) : 0;
      const nxt = Math.min(Math.max(0, cur + delta), maxIdx);
      el.scrollTo({ left: nxt * step, behavior: "smooth" });
      setIdx(nxt);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [maxIdx]);

  return (
    <section id="store" className={styles.vendorSearchSection}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t("vendorSearch.title")}</h2>
          <p className={styles.description}>{t("vendorSearch.description")}</p>
        </div>

        <div className={styles.carouselWrapper}>
          <div className={styles.vendorCards} ref={trackRef} onScroll={handleScroll} dir="ltr">
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

          <div className={styles.controls}>
            <button
              className={styles.ctrlBtn}
              onClick={isAr ? next : prev}
              disabled={isAr ? idx >= maxIdx : idx <= 0}
              aria-label={isAr ? "التالي" : "Previous"}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d={isAr ? "M8 5l5 5-5 5" : "M12 5l-5 5 5 5"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className={styles.dots}>
              {Array.from({ length: maxIdx + 1 }).map((_, i) => (
                <button
                  key={i}
                  className={`${styles.dot}${i === idx ? ` ${styles.dotActive}` : ""}`}
                  onClick={() => scrollToIdx(i)}
                  aria-label={`${i + 1}`}
                />
              ))}
            </div>
            <button
              className={styles.ctrlBtn}
              onClick={isAr ? prev : next}
              disabled={isAr ? idx <= 0 : idx >= maxIdx}
              aria-label={isAr ? "السابق" : "Next"}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d={isAr ? "M12 5l-5 5 5 5" : "M8 5l5 5-5 5"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        <button className={styles.moreButton}>{t("vendorSearch.moreBtn")}</button>
      </div>
    </section>
  );
};

export default VendorSearchSection;
