"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import styles from "./invitationsCarousel.module.css";
import { useTranslation } from "react-i18next";

const TEMPLATE_IMAGES = [
  "1.png",
  "2.png",
  "3.png",
  "4.png",
  "5.png",
  "6.png",
  "7.png",
  "8.png",
  "9.png",
  "10.png",
  "11.png",
  "12.png",
  "13.png",
  "14.jpg",
  "15.png",
  "16.png",
];

const GAP = 48;
const VISIBLE_DOTS = 7;

const InvitationsCarousel = ({ lang = "ar" }) => {
  const { t } = useTranslation("landing");
  const isAr = lang === "ar";
  const trackRef = useRef(null);
  const throttleRef = useRef(false);
  const [idx, setIdx] = useState(0);
  const maxIdx = TEMPLATE_IMAGES.length - 1;

  const scrollToIdx = useCallback((i) => {
    const el = trackRef.current;
    if (!el) return;
    const cardW = el.firstElementChild?.offsetWidth || 0;
    el.scrollTo({ left: i * (cardW + GAP), behavior: "smooth" });
    setIdx(i);
  }, []);

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

  // Sliding dots window: always show VISIBLE_DOTS, centred on active index
  const half = Math.floor(VISIBLE_DOTS / 2);
  const windowStart = Math.min(
    Math.max(0, idx - half),
    Math.max(0, maxIdx - VISIBLE_DOTS + 1)
  );
  const visibleDots = Array.from(
    { length: Math.min(VISIBLE_DOTS, maxIdx + 1) },
    (_, i) => windowStart + i
  );

  return (
    <section id="invitations" className={styles.invitationsSection}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t("invitations.title")}</h2>
        <p className={styles.description}>{t("invitations.description")}</p>
      </div>

      <div className={styles.carouselWrapper}>
        <div
          className={styles.carousel}
          ref={trackRef}
          onScroll={handleScroll}
          dir="ltr"
        >
          {TEMPLATE_IMAGES.map((file, i) => (
            <div key={i} className={styles.invitationCard}>
              <img src={`/template-cards/${file}`} alt="" />
            </div>
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
              <path
                d={isAr ? "M8 5l5 5-5 5" : "M12 5l-5 5 5 5"}
                stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className={styles.dots}>
            {visibleDots.map((i) => (
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
              <path
                d={isAr ? "M12 5l-5 5 5 5" : "M8 5l5 5-5 5"}
                stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
};

export default InvitationsCarousel;
