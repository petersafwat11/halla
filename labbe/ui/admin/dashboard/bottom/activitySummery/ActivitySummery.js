import React from "react";
import styles from "./activitySummery.module.css";
import { useTranslation } from "react-i18next";

const ActivitySummery = ({ lastEvents = [] }) => {
  const { t } = useTranslation("adminDashboard");

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t("bottom.activitySummary")}</h1>
      <div className={styles.list}>
        {lastEvents.map((item, index) => (
          <div className={styles.item} key={index}>
            <p className={styles.eventTitle}>{item.title}</p>
            <p className={styles.username}>{item.hostUsername}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivitySummery;
