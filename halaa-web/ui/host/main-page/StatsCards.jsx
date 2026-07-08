"use client";

import styles from "./StatsCards.module.css";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";

function StatsCards({ cards: cardsProp, data, isLoading }) {
  const { t } = useTranslation("home-events");

  const cards = cardsProp || data?.cards || data?.data?.cards || [];

  if (isLoading) {
    return <SimpleLoading message={t("loading")} />;
  }

  if (!cards || cards.length === 0) {
    return null;
  }

  return (
    <div className={styles.statsContainer}>
      <div className={styles.statsGrid}>
        {cards.map((card) => (
          <div key={card.id || card.title} className={styles.statCard}>
            <div className={styles.cardInfo}>
              <div className={styles.cardTitle}>{card.title}</div>
              <div className={styles.cardValue}>{card.value}</div>
            </div>
            {typeof card.src === "string" ? (
              <Image className={styles.icon} src={card.src} alt={card.alt} width={24} height={24} />
            ) : (
              card.src
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default StatsCards;
