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

          <div className={styles.features}>
            <div className={styles.feature}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8.14667 1.33594H7.85333C7.49971 1.33594 7.16057 1.47641 6.91053 1.72646C6.66048 1.97651 6.52 2.31565 6.52 2.66927V2.78927C6.51976 3.02309 6.45804 3.25273 6.34103 3.45516C6.22401 3.65759 6.05583 3.8257 5.85333 3.9426L5.56667 4.10927C5.36398 4.2263 5.13405 4.2879 4.9 4.2879C4.66595 4.2879 4.43603 4.2263 4.23333 4.10927L4.13333 4.05594C3.82738 3.87945 3.46389 3.83157 3.12267 3.92281C2.78145 4.01405 2.49037 4.23696 2.31333 4.5426L2.16667 4.79594C1.99018 5.10189 1.9423 5.46538 2.03354 5.8066C2.12478 6.14783 2.34769 6.4389 2.65333 6.61594L2.75333 6.6826C2.95485 6.79894 3.12241 6.966 3.23937 7.16716C3.35632 7.36832 3.4186 7.59659 3.42 7.82927V8.16927C3.42093 8.40422 3.35977 8.63524 3.2427 8.83894C3.12563 9.04265 2.95681 9.2118 2.75333 9.32927L2.65333 9.38927C2.34769 9.56631 2.12478 9.85738 2.03354 10.1986C1.9423 10.5398 1.99018 10.9033 2.16667 11.2093L2.31333 11.4626C2.49037 11.7682 2.78145 11.9912 3.12267 12.0824C3.46389 12.1736 3.82738 12.1258 4.13333 11.9493L4.23333 11.8959C4.43603 11.7789 4.66595 11.7173 4.9 11.7173C5.13405 11.7173 5.36398 11.7789 5.56667 11.8959L5.85333 12.0626C6.05583 12.1795 6.22401 12.3476 6.34103 12.55C6.45804 12.7525 6.51976 12.9821 6.52 13.2159V13.3359C6.52 13.6896 6.66048 14.0287 6.91053 14.2787C7.16057 14.5288 7.49971 14.6693 7.85333 14.6693H8.14667C8.50029 14.6693 8.83943 14.5288 9.08948 14.2787C9.33953 14.0287 9.48 13.6896 9.48 13.3359V13.2159C9.48024 12.9821 9.54196 12.7525 9.65898 12.55C9.77599 12.3476 9.94418 12.1795 10.1467 12.0626L10.4333 11.8959C10.636 11.7789 10.866 11.7173 11.1 11.7173C11.3341 11.7173 11.564 11.7789 11.7667 11.8959L11.8667 11.9493C12.1726 12.1258 12.5361 12.1736 12.8773 12.0824C13.2186 11.9912 13.5096 11.7682 13.6867 11.4626L13.8333 11.2026C14.0098 10.8966 14.0577 10.5332 13.9665 10.1919C13.8752 9.85072 13.6523 9.55964 13.3467 9.3826L13.2467 9.32927C13.0432 9.2118 12.8744 9.04265 12.7573 8.83894C12.6402 8.63524 12.5791 8.40422 12.58 8.16927V7.83594C12.5791 7.60099 12.6402 7.36997 12.7573 7.16627C12.8744 6.96256 13.0432 6.79341 13.2467 6.67594L13.3467 6.61594C13.6523 6.4389 13.8752 6.14783 13.9665 5.8066C14.0577 5.46538 14.0098 5.10189 13.8333 4.79594L13.6867 4.5426C13.5096 4.23696 13.2186 4.01405 12.8773 3.92281C12.5361 3.83157 12.1726 3.87945 11.8667 4.05594L11.7667 4.10927C11.564 4.2263 11.3341 4.2879 11.1 4.2879C10.866 4.2879 10.636 4.2263 10.4333 4.10927L10.1467 3.9426C9.94418 3.8257 9.77599 3.65759 9.65898 3.45516C9.54196 3.25273 9.48024 3.02309 9.48 2.78927V2.66927C9.48 2.31565 9.33953 1.97651 9.08948 1.72646C8.83943 1.47641 8.50029 1.33594 8.14667 1.33594Z" stroke="#74635d" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z" stroke="#74635d" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{t("vendorCTA.feature1")}</span>
            </div>
            <div className={styles.feature}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14.6666 4.66406L8.99992 10.3307L5.66659 6.9974L1.33325 11.3307" stroke="#74635d" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10.6667 4.66406H14.6667V8.66406" stroke="#74635d" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{t("vendorCTA.feature2")}</span>
            </div>
            <div className={styles.feature}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.6667 14V12.6667C10.6667 11.9594 10.3858 11.2811 9.88566 10.781C9.38556 10.281 8.70728 10 8.00004 10H4.00004C3.2928 10 2.61452 10.281 2.11442 10.781C1.61433 11.2811 1.33337 11.9594 1.33337 12.6667V14" stroke="#74635d" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6.00004 7.33333C7.4728 7.33333 8.66671 6.13943 8.66671 4.66667C8.66671 3.19391 7.4728 2 6.00004 2C4.52728 2 3.33337 3.19391 3.33337 4.66667C3.33337 6.13943 4.52728 7.33333 6.00004 7.33333Z" stroke="#74635d" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14.6666 13.9993V12.6659C14.6662 12.0751 14.4695 11.5011 14.1075 11.0341C13.7455 10.5672 13.2387 10.2336 12.6666 10.0859" stroke="#74635d" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10.6666 2.08594C11.2402 2.2328 11.7487 2.5664 12.1117 3.03414C12.4748 3.50188 12.6719 4.07716 12.6719 4.66927C12.6719 5.26138 12.4748 5.83666 12.1117 6.3044C11.7487 6.77214 11.2402 7.10574 10.6666 7.2526" stroke="#74635d" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{t("vendorCTA.feature3")}</span>
            </div>
          </div>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className={styles.indicator}></div>
              <span>{t("vendorCTA.stat1")}</span>
            </div>
            <div className={styles.stat}>
              <div className={styles.indicator}></div>
              <span>{t("vendorCTA.stat2")}</span>
            </div>
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
