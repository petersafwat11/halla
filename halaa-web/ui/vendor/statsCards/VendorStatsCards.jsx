"use client";
import React from "react";
import styles from "./vendorStatsCards.module.css";
import { useTranslation } from "react-i18next";
import Image from "next/image";

const VendorStatsCards = ({ stats }) => {
  const { t } = useTranslation("vendorServices");

  const cards = [
    {
      id: "total",
      icon: (
        <Image
          src={"/svg/vendor/rate.svg"}
          width={16}
          height={16}
          alt="total"
        />
      ),
      title: t("stats.totalServices"),
      value: stats?.totalServices ?? 0,
      bgColor: "#E1FFC2",
    },

    {
      id: "active",
      icon: (
        <Image
          src={"/svg/vendor/active.svg"}
          width={16}
          height={16}
          alt="active"
        />
      ),
      title: t("stats.activeServices"),
      value: stats?.activeServices ?? 0,
      bgColor: "#F9F4EF",
    },
    {
      id: "inactive",
      icon: (
        <Image
          src={"/svg/vendor/inactive.svg"}
          width={16}
          height={16}
          alt="inactive"
        />
      ),
      title: t("stats.inactiveServices"),
      value: stats?.inactiveServices ?? 0,
      bgColor: "#FFFCE0",
    },
    {
      id: "rating",
      icon: (
        <Image src={"/svg/vendor/rate.svg"} width={16} height={16} alt="rate" />
      ),
      title: t("stats.totalRating"),
      value: stats?.rating ?? "0.0",
      bgColor: "#E1FFC2",
    },
  ];

  return (
    <div className={styles.statsContainer}>
      <div className={styles.statsGrid}>
        {cards.map((card) => (
          <div key={card.id} className={styles.statCard}>
            <div className={styles.cardInfo}>
              <div className={styles.cardTitle}>{card.title}</div>
              <div className={styles.valueSection}>
                <div className={styles.cardValue}>{card.value}</div>
              </div>
            </div>

            <div
              className={styles.cardIcon}
              style={{ background: card.bgColor }}
            >
              {card.icon}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VendorStatsCards;
