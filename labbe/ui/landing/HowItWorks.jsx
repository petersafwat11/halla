"use client";
import styles from "./HowItWorks.module.css";
import { CalendarPlus, Send, ClipboardList, QrCode } from "lucide-react";
import { useTranslation } from "react-i18next";
import useCarouselSnap from "./_shared/useCarouselSnap";
import CarouselDots from "./_shared/CarouselDots";

const ICON_COLOR = "#c47a6d";
const ICON_SIZE = 32;
const GAP = 14;
const STEP_ICONS = [CalendarPlus, Send, ClipboardList, QrCode];

export default function HowItWorks({ lang = "ar" }) {
  const { t } = useTranslation("landing");
  const isAr = lang === "ar";
  const steps = t("howItWorks.steps", { returnObjects: true });
  const { trackRef, idx, maxIdx, scrollToIdx, handleScroll } = useCarouselSnap({
    gap: GAP,
    totalItems: steps.length,
  });

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

          <CarouselDots
            idx={idx}
            maxIdx={maxIdx}
            onChange={scrollToIdx}
            isAr={isAr}
            prevLabel={t("howItWorks.prevBtn")}
            nextLabel={t("howItWorks.nextBtn")}
            classes={{
              controls: styles.hiwControls,
              ctrlBtn: styles.hiwCtrlBtn,
              dots: styles.hiwDots,
              dot: styles.hiwDot,
              dotActive: styles.active,
            }}
          />
        </div>
      </div>
    </section>
  );
}
