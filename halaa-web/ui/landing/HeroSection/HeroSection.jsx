"use client";
import React from "react";
import styles from "./heroSection.module.css";
import AppStoreButtons from "../../commen/AppStoreButtons/AppStoreButtons";
import { useTranslation } from "react-i18next";

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
            <p className={styles.appText}>{t("hero.appText")}</p>
            <AppStoreButtons lang={lang} direction="row" />
          </div>
        </div>

        <div className={styles.imageGridWrapper}>
          <div className={styles.imageGrid}>
            <img src="/landing/6.png" alt="" className={styles.img1} />
            <img src="/landing/7.png" alt="" className={styles.img2} />
            <img src="/landing/1.png" alt="" className={styles.img3} />
            <img src="/landing/11.png" alt="" className={styles.img4} />
            <div className={styles.videoWrapper}>
              <img src="/landing/3.png" alt="" className={styles.img5} />
            </div>
            <img src="/landing/4.png" alt="" className={styles.img6} />
            <img src="/landing/5.png" alt="" className={styles.img7} />
            <img src="/landing/2.png" alt="" className={styles.img8} />
          </div>
        </div>

      </div>
    </section>
  );
};

export default HeroSection;
