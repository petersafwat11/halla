"use client";

import { useTranslation } from "react-i18next";
import styles from "./VendorDetailsWrapper.module.css";

const CATEGORY_LABELS = {
  eventPlanning: "categories.eventPlanning",
  mediaProduction: "categories.mediaProduction",
  giftsAndGiveaways: "categories.giftsAndGiveaways",
  foodAndBeverages: "categories.foodAndBeverages",
  beautyAndFashion: "categories.beautyAndFashion",
  logisticsAndDelivery: "categories.logisticsAndDelivery",
  corporateServices: "categories.corporateServices",
  supportServices: "categories.supportServices",
  technicalServices: "categories.technicalServices",
  soundLightingEntertainment: "categories.soundLightingEntertainment",
  hallsAndVenues: "categories.hallsAndVenues",
};

const SERVICE_LABELS = {
  eventCoordination: "services.eventCoordination",
  weddingPlanning: "services.weddingPlanning",
  corporateEventPlanning: "services.corporateEventPlanning",
  birthdayPartyPlanning: "services.birthdayPartyPlanning",
  hallAndLoungeRentals: "services.hallAndLoungeRentals",
  outdoorEventSetup: "services.outdoorEventSetup",
  photography: "services.photography",
  videography: "services.videography",
  liveStreaming: "services.liveStreaming",
  dronePhotography: "services.dronePhotography",
  photoBooths: "services.photoBooths",
  videoEditing: "services.videoEditing",
};

export default function VendorServiceCategories({ serviceCategories }) {
  const { t } = useTranslation("adminVendorDetails");

  if (!serviceCategories || Object.keys(serviceCategories).length === 0) {
    return <p className={styles.noData}>{t("services.noServices")}</p>;
  }

  return (
    <div className={styles.servicesContainer}>
      {Object.entries(serviceCategories).map(([category, values]) => {
        if (!values || values.length === 0) return null;
        return (
          <div key={category} className={styles.serviceCategory}>
            <h3 className={styles.serviceCategoryTitle}>
              {t(CATEGORY_LABELS[category] || "", category)}
            </h3>
            <ul className={styles.serviceList}>
              {values.map((value, idx) => (
                <li key={idx} className={styles.serviceItem}>
                  {t(SERVICE_LABELS[value] || "", value)}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
