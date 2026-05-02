import React from "react";
import styles from "./topVendors.module.css";
import { useTranslation } from "react-i18next";


const topVendors = ({ bestVendors = [] }) => {
  const { t } = useTranslation("adminDashboard");

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t("bottom.topVendors")}</h1>
      <div className={styles.list}>
        {bestVendors.map((vendor, index) => (
          <div className={styles.item} key={index}>
            <h3 className={styles.name}>{vendor.name}</h3>
            <p className={styles.clicks}>
              {vendor.numberOfClicks} {t("bottom.clicks")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default topVendors;
