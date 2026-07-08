"use client";
import React from "react";
import styles from "./appDownloadSection.module.css";
import Image from "next/image";
import AppStoreButtons from "../../commen/AppStoreButtons/AppStoreButtons";
import { useTranslation } from "react-i18next";

const AppDownloadSection = ({ lang = "ar" }) => {
  const { t } = useTranslation("landing");

  return (
    <section className={styles.appDownloadSection}>
      <div className={styles.heroBackground}>
        <img
          src="https://api.builder.io/api/v1/image/assets/TEMP/0990307d7e3722943524fbee2d3fd0b7fd4aa09e?width=3844"
          alt=""
          className={styles.backgroundPattern}
        />

        <div className={styles.content}>
          <div className={styles.textContent}>
            <p className={styles.brandLabel}>{t("appDownload.brand")}</p>
            <h2 className={styles.title}>{t("appDownload.title")}</h2>
            <p className={styles.description} style={{ whiteSpace: "pre-line" }}>
              {t("appDownload.description")}
            </p>
            <AppStoreButtons lang={lang} direction="row" />
          </div>

          <div className={styles.phoneMockup}>
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/0646e2c02b5c53276f1a033ca24a89ef8f57cb38?width=645"
              alt=""
              className={styles.phoneShadow}
            />
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/414f816309244e0abbd3034a47b3c7e4bb683d51?width=645"
              alt="iPhone mockup"
              className={styles.phoneMain}
            />
            <div className={styles.phoneScreen}>
              <img
                src="https://api.builder.io/api/v1/image/assets/TEMP/06c779e87910e9999d6375287b884b1617d895dc?width=581"
                alt="App screenshot"
                className={styles.screenshot}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AppDownloadSection;
