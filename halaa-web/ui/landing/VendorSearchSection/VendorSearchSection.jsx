"use client";
import React from "react";
import styles from "./vendorSearchSection.module.css";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import VendorCard from "@/app/[lang]/market-place/_components/card/Card";
import useCarouselSnap from "../_shared/useCarouselSnap";
import CarouselDots from "../_shared/CarouselDots";

const GAP = 28;

const VendorSearchSection = ({ lang = "ar", vendors = [] }) => {
  const { t } = useTranslation("landing");
  const { trackRef, idx, maxIdx, scrollToIdx, goPrev, goNext, handleScroll } = useCarouselSnap({
    gap: GAP,
    totalItems: vendors.length,
  });

  if (!vendors.length) return null;

  return (
    <section id="store" className={styles.vendorSearchSection}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t("vendorSearch.title")}</h2>
          <p className={styles.description}>{t("vendorSearch.description")}</p>
        </div>

        <div className={styles.carouselWrapper}>
          <div className={styles.vendorCards} ref={trackRef} onScroll={handleScroll}>
            {vendors.map((vendor) => (
              <div key={vendor.id} className={styles.vendorCardItem}>
                <VendorCard
                  vendor={vendor}
                  href={`/${lang}/market-place/vendors/${vendor.id}`}
                />
              </div>
            ))}
          </div>

          <CarouselDots
            idx={idx}
            maxIdx={maxIdx}
            onChange={scrollToIdx}
            onPrev={goPrev}
            onNext={goNext}
            classes={{
              controls: styles.controls,
              ctrlBtn: styles.ctrlBtn,
              dots: styles.dots,
              dot: styles.dot,
              dotActive: styles.dotActive,
            }}
          />
        </div>

        <Link href={`/${lang}/market-place`} className={styles.moreButton}>
          {t("vendorSearch.moreBtn")}
        </Link>
      </div>
    </section>
  );
};

export default VendorSearchSection;
