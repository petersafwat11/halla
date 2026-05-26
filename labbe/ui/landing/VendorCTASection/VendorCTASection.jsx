"use client";
import React from "react";
import styles from "./vendorCTASection.module.css";
import Link from "next/link";
import { useTranslation } from "react-i18next";

const VendorCTASection = ({ lang = "ar" }) => {
  const { t } = useTranslation("landing");

  return (
    <section id="join" className={styles.vendorCTASection}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.textContent}>
            <h2 className={styles.title}>
              {t("vendorCTA.title")}{" "}
              <span className={styles.highlight}>{t("vendorCTA.titleHighlight")}</span>{" "}
              {t("vendorCTA.titleEnd")}
            </h2>
            <p className={styles.description}>{t("vendorCTA.description")}</p>
          </div>

          <Link href={`/${lang}/signup-vendor`} className={styles.ctaButton}>
            {t("vendorCTA.cta")}
          </Link>
        </div>

        <div className={styles.imageWrapper}>
          <div className={styles.imageContainer}>
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/87f2f30bbbccdfbe5323362a8f98b68b4473b7dd?width=850"
              alt="Vendors collaborating with event planners"
              className={styles.vendorImage}
            />
            <div className={styles.gradient}></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VendorCTASection;
