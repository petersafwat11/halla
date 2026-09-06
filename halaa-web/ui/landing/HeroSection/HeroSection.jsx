"use client";
import React from "react";
import styles from "./heroSection.module.css";
import AppStoreButtons from "../../commen/AppStoreButtons/AppStoreButtons";
import { useTranslation } from "react-i18next";

const EMPTY_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
function HeroTile({ id, className }) {
  return (
    <picture>
      <source media="(min-width: 901px)" srcSet={`/landing/${id}.webp`} type="image/webp" />
      <img src={EMPTY_IMAGE} alt="" loading="lazy" decoding="async" className={className} />
    </picture>
  );
}

const HeroSection = ({ lang = "ar" }) => {
  const { t } = useTranslation("landing");

  return (
    <section id="home" className={styles.heroWrapper}>
      <div className={styles.heroSection}>
        <div className={styles.content}>
          <h1 className={styles.title}>
            <span className={styles.titleBlack}>{t("hero.titleBlack1")}</span>
            <span className={styles.titleBrand}>{t("hero.titleBrand")}</span>
            <span className={styles.titleBlack}>{t("hero.titleBlack2")}</span>
          </h1>

          <p className={styles.description}>{t("hero.description")}</p>

          <div className={styles.ctaContainer}>
            <AppStoreButtons lang={lang} direction="row" />
          </div>
        </div>

        <div className={styles.imageGridWrapper}>
          <div className={styles.imageGrid}>
            <HeroTile id={6} className={styles.img1} />
            <HeroTile id={7} className={styles.img2} />
            <HeroTile id={1} className={styles.img3} />
            <HeroTile id={11} className={styles.img4} />
            <div className={styles.videoWrapper}>
              <HeroTile id={3} className={styles.img5} />
            </div>
            <HeroTile id={4} className={styles.img6} />
            <HeroTile id={5} className={styles.img7} />
            <HeroTile id={2} className={styles.img8} />
          </div>
        </div>

      </div>
    </section>
  );
};

export default HeroSection;
