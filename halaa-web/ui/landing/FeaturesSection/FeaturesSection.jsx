"use client";
import React from "react";
import styles from "./featuresSection.module.css";
import {
  CalendarPlus, Mail, MessageCircle, Users, QrCode,
  UserCheck, BarChart2, Bell, Gift, ShoppingBag, Building2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import useCarouselSnap from "../_shared/useCarouselSnap";
import CarouselDots from "../_shared/CarouselDots";

const ICON_COLOR = "#c47a6d";
const ICON_SIZE = 28;
const GAP = 14;
const FEATURE_ICONS = [CalendarPlus, Mail, MessageCircle, Users, QrCode, UserCheck, BarChart2, Bell, Gift, ShoppingBag, Building2];

const FeatureCard = ({ Icon, title, description }) => (
  <div className={styles.featureCard}>
    <div className={styles.iconWrapper}>
      <Icon size={ICON_SIZE} color={ICON_COLOR} strokeWidth={1.75} />
    </div>
    <h3 className={styles.featureTitle}>{title}</h3>
    <p className={styles.featureDescription}>{description}</p>
  </div>
);

const FeaturesSection = ({ lang = "ar" }) => {
  const { t } = useTranslation("landing");
  const items = t("features.items", { returnObjects: true });
  const { trackRef, idx, maxIdx, scrollToIdx, goPrev, goNext, handleScroll } = useCarouselSnap({
    gap: GAP,
    totalItems: items.length,
  });

  return (
    <section id="features" className={styles.featuresSection}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t("features.heading")}</h2>
        <p className={styles.description}>{t("features.subheading")}</p>
      </div>

      <div className={styles.carouselWrapper}>
        <div className={styles.featuresGrid} ref={trackRef} onScroll={handleScroll} tabIndex={0} role="region" aria-label={t('features.heading')}>
          {items.map((feature, index) => (
            <FeatureCard
              key={index}
              Icon={FEATURE_ICONS[index]}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>

        <CarouselDots
          idx={idx}
          maxIdx={maxIdx}
          onChange={scrollToIdx}
          onPrev={goPrev}
          onNext={goNext}
          classes={{
            controls: styles.controls,
            ctrlBtn: styles.ctrlBtn,
            dots: styles.dots,
            dot: styles.dot,
            dotActive: styles.dotActive,
          }}
        />
      </div>
    </section>
  );
};

export default FeaturesSection;
