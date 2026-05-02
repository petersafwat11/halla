"use client";
import styles from "./TestimonialsSection.module.css";
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

const avBg = ["#c47a6d", "#9e5e53", "#4d3d39", "#d39285", "#7d4b43", "#3a2e2b"];
const GAP = 16;

export default function TestimonialsSection({ lang = "ar" }) {
  const { t } = useTranslation("landing");
  const isAr = lang === "ar";
  const items = t("testimonials.items", { returnObjects: true });
  const trackRef = useRef(null);
  const [idx, setIdx] = useState(0);
  const throttleRef = useRef(false);
  const perView = 3;
  const maxIdx = items.length - perView;

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
    <>
      <section id="reviews" className={styles.testRoot}>
        <div className={styles.testInner}>
          <div className={styles.testHdr}>
            <span className={styles.testEyebrow}>{t("testimonials.eyebrow")}</span>
            <h2 className={styles.testTitle}>{t("testimonials.title")}</h2>
            <p className={styles.testSub}>{t("testimonials.sub")}</p>
          </div>

          <div className={styles.testCarousel}>
            <div className={styles.testTrack} ref={trackRef} onScroll={handleScroll} dir="ltr">
              {items.map((r, i) => (
                <div key={i} className={styles.testCard} dir={isAr ? "rtl" : "ltr"}>
                  <div className={styles.testStars} aria-label={`${r.rating || 5} stars`}>{"★".repeat(r.rating || 5)}</div>
                  <p className={styles.testText}>{r.text}</p>
                  <div className={styles.testAuthor}>
                    <div className={styles.testAvatar} style={{ background: avBg[i % avBg.length] }}>
                      {r.name.charAt(0)}
                    </div>
                    <div>
                      <div className={styles.testName}>{r.name}</div>
                      <div className={styles.testRole}>{r.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.testControls}>
              <button
                className={styles.testBtn}
                onClick={isAr ? next : prev}
                disabled={isAr ? idx >= maxIdx : idx <= 0}
                aria-label={t("testimonials.prevBtn")}
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d={isAr ? "M8 5l5 5-5 5" : "M12 5l-5 5 5 5"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className={styles.testDots} role="tablist">
                {Array.from({ length: maxIdx + 1 }).map((_, i) => (
                  <button
                    key={i}
                    role="tab"
                    aria-selected={i === idx}
                    className={`${styles.testDot}${i === idx ? ` ${styles.active}` : ""}`}
                    onClick={() => scrollToIdx(i)}
                    aria-label={`${i + 1}`}
                  />
                ))}
              </div>
              <button
                className={styles.testBtn}
                onClick={isAr ? prev : next}
                disabled={isAr ? idx <= 0 : idx >= maxIdx}
                aria-label={t("testimonials.nextBtn")}
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d={isAr ? "M12 5l-5 5 5 5" : "M8 5l5 5-5 5"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
