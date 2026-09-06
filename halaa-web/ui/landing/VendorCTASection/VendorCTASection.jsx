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

      </div>
    </section>
  );
};

export default VendorCTASection;
