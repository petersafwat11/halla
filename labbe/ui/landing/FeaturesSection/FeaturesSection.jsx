"use client";
import React, { useState, useRef, useEffect } from "react";
import styles from "./featuresSection.module.css";
import {
  CalendarPlus, Mail, MessageCircle, Users, QrCode,
  UserCheck, BarChart2, Bell, Gift, ShoppingBag, Building2,
} from "lucide-react";
import { useTranslation } from "react-i18next";

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
  const isAr = lang === "ar";
  const items = t("features.items", { returnObjects: true });
  const trackRef = useRef(null);
  const [idx, setIdx] = useState(0);
  const throttleRef = useRef(false);
  const maxIdx = items.length - 1;

  const scrollToIdx = (i) => {
    const el = trackRef.current;
    if (!el) return;
    const cardW = el.firstElementChild?.offsetWidth || 0;
    el.scrollTo({ left: i * (cardW + GAP), behavior: "smooth" });
    setIdx(i);
  };

  const prev = () => scrollToIdx(Math.max(0, idx - 1));
  const next = () => scrollToIdx(Math.min(maxIdx, idx + 1));

  const handleScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const cardW = el.firstElementChild?.offsetWidth || 0;
    const step = cardW + GAP;
    if (step > 0) setIdx(Math.min(Math.max(0, Math.round(el.scrollLeft / step)), maxIdx));
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      if (throttleRef.current) return;
      throttleRef.current = true;
      setTimeout(() => { throttleRef.current = false; }, 420);
      const delta = (e.deltaY || e.deltaX) > 0 ? 1 : -1;
      const cardW = el.firstElementChild?.offsetWidth || 0;
      const step = cardW + GAP;
      const cur = step > 0 ? Math.round(el.scrollLeft / step) : 0;
      const nxt = Math.min(Math.max(0, cur + delta), maxIdx);
      el.scrollTo({ left: nxt * step, behavior: "smooth" });
      setIdx(nxt);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [maxIdx]);

  return (
    <section id="features" className={styles.featuresSection}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t("features.heading")}</h2>
        <p className={styles.description}>{t("features.subheading")}</p>
      </div>

      <div className={styles.carouselWrapper}>
        <div className={styles.featuresGrid} ref={trackRef} onScroll={handleScroll}>
          {items.map((feature, index) => (
            <FeatureCard
              key={index}
              Icon={FEATURE_ICONS[index]}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>

        <div className={styles.controls}>
          <button
            className={styles.ctrlBtn}
            onClick={isAr ? next : prev}
            disabled={isAr ? idx >= maxIdx : idx <= 0}
            aria-label={isAr ? "التالي" : "Previous"}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d={isAr ? "M8 5l5 5-5 5" : "M12 5l-5 5 5 5"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className={styles.dots}>
            {Array.from({ length: maxIdx + 1 }).map((_, i) => (
              <button
                key={i}
                className={`${styles.dot}${i === idx ? ` ${styles.dotActive}` : ""}`}
                onClick={() => scrollToIdx(i)}
                aria-label={`${i + 1}`}
              />
            ))}
          </div>

          <button
            className={styles.ctrlBtn}
            onClick={isAr ? prev : next}
            disabled={isAr ? idx <= 0 : idx >= maxIdx}
            aria-label={isAr ? "السابق" : "Next"}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d={isAr ? "M12 5l-5 5 5 5" : "M8 5l5 5-5 5"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
