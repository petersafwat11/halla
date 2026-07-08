"use client";
import styles from "./TestimonialsSection.module.css";
import { useTranslation } from "react-i18next";
import useCarouselSnap from "./_shared/useCarouselSnap";
import CarouselDots from "./_shared/CarouselDots";

const avBg = ["#c47a6d", "#9e5e53", "#4d3d39", "#d39285", "#7d4b43", "#3a2e2b"];
const GAP = 16;

export default function TestimonialsSection({ lang = "ar" }) {
  const { t } = useTranslation("landing");
  const items = t("testimonials.items", { returnObjects: true });
  const { trackRef, idx, maxIdx, scrollToIdx, goPrev, goNext, handleScroll } = useCarouselSnap({
    gap: GAP,
    totalItems: items.length,
  });

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
            <div className={styles.testTrack} ref={trackRef} onScroll={handleScroll}>
              {items.map((r, i) => (
                <div key={i} className={styles.testCard}>
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

            <CarouselDots
              idx={idx}
              maxIdx={maxIdx}
              onChange={scrollToIdx}
              onPrev={goPrev}
              onNext={goNext}
              prevLabel={t("testimonials.prevBtn")}
              nextLabel={t("testimonials.nextBtn")}
              dotRole="tablist"
              classes={{
                controls: styles.testControls,
                ctrlBtn: styles.testBtn,
                dots: styles.testDots,
                dot: styles.testDot,
                dotActive: styles.active,
              }}
            />
          </div>
        </div>
      </section>
    </>
  );
}
