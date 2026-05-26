"use client";
import styles from "./HowItWorks.module.css";
import { useState, useRef, useEffect } from "react";
import { CalendarPlus, Send, ClipboardList, QrCode } from "lucide-react";
import { useTranslation } from "react-i18next";

const ICON_COLOR = "#c47a6d";
const ICON_SIZE = 32;
const GAP = 14;
const STEP_ICONS = [CalendarPlus, Send, ClipboardList, QrCode];

export default function HowItWorks({ lang = "ar" }) {
  const { t } = useTranslation("landing");
  const isAr = lang === "ar";
  const steps = t("howItWorks.steps", { returnObjects: true });
  const trackRef = useRef(null);
  const [idx, setIdx] = useState(0);
  const throttleRef = useRef(false);
  const maxIdx = steps.length - 1;

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
    <section id="how-it-works" className={styles.hiwRoot}>
      <div className={styles.hiwInner}>
        <div className={styles.hiwHdr}>
          <h2 className={styles.hiwTitle}>{t("howItWorks.title")}</h2>
          <p className={styles.hiwSub}>{t("howItWorks.sub")}</p>
        </div>

        <div className={styles.hiwCarousel}>
          <div className={styles.hiwSteps} ref={trackRef} onScroll={handleScroll}>
            {steps.map((s, i) => {
              const Icon = STEP_ICONS[i];
              return (
                <div key={i} className={styles.hiwStep}>
                  <span className={styles.hiwStepIcon} aria-hidden="true">
                    <Icon size={ICON_SIZE} color={ICON_COLOR} strokeWidth={1.75} />
                  </span>
                  <div className={styles.hiwStepTitle}>{s.title}</div>
                  <div className={styles.hiwStepDesc}>{s.desc}</div>
                </div>
              );
            })}
          </div>

          <div className={styles.hiwControls}>
            <button
              className={styles.hiwCtrlBtn}
              onClick={isAr ? next : prev}
              disabled={isAr ? idx >= maxIdx : idx <= 0}
              aria-label={t("howItWorks.nextBtn")}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d={isAr ? "M8 5l5 5-5 5" : "M12 5l-5 5 5 5"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className={styles.hiwDots}>
              {Array.from({ length: maxIdx + 1 }).map((_, i) => (
                <button
                  key={i}
                  className={`${styles.hiwDot}${i === idx ? ` ${styles.active}` : ""}`}
                  onClick={() => scrollToIdx(i)}
                  aria-label={`${i + 1}`}
                />
              ))}
            </div>

            <button
              className={styles.hiwCtrlBtn}
              onClick={isAr ? prev : next}
              disabled={isAr ? idx <= 0 : idx >= maxIdx}
              aria-label={t("howItWorks.prevBtn")}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d={isAr ? "M12 5l-5 5 5 5" : "M8 5l5 5-5 5"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
