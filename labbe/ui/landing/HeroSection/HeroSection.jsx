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
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/06755bccd0e180e1c8e1c29eeec229a5ddfc9d11?width=422"
              alt=""
              className={styles.img1}
            />
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/52fa01fa93985438eef1ae0111837a4e2f8a88d7?width=386"
              alt=""
              className={styles.img2}
            />
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/1307055cf8a07b8b6a663151ca4922ca0e3ed3d5?width=360"
              alt=""
              className={styles.img3}
            />
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/956cca64f64c20f7ace9cdc9112ec9767880a121?width=667"
              alt=""
              className={styles.img4}
            />
            <div className={styles.videoWrapper}>
              <img
                src="https://api.builder.io/api/v1/image/assets/TEMP/ad33659c33381eac40061641b81f19d65a13ad9f?width=667"
                alt=""
                className={styles.img5}
              />
            </div>
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/35173bb94eff2bb4a1098c0e05253903fe77fdd2?width=422"
              alt=""
              className={styles.img6}
            />
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/ceaa707b0ecb6f40405690236d33d3ac7d58398b?width=299"
              alt=""
              className={styles.img7}
            />
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/e8939c56cdb6fd3f5a79eb3bb858552d4f96ce8c?width=360"
              alt=""
              className={styles.img8}
            />
          </div>
        </div>

      </div>
    </section>
  );
};

export default HeroSection;
