"use client";
import styles from "./TestimonialsSection.module.css";
import { useTranslation } from "react-i18next";
import useCarouselSnap from "./_shared/useCarouselSnap";
import CarouselDots from "./_shared/CarouselDots";

const avBg = ["#c47a6d", "#9e5e53", "#4d3d39", "#d39285", "#7d4b43", "#3a2e2b"];
const GAP = 16;

// Remains opt-in until genuine, approved customer feedback is available.
export default function TestimonialsSection({ enabled = false }) {
  const { t } = useTranslation("landing");
  const translatedItems = t("testimonials.items", { returnObjects: true });
  const items = Array.isArray(translatedItems)
    ? translatedItems.filter((item) => item && typeof item.name === "string" && item.name.trim()
      && typeof item.text === "string" && item.text.trim())
    : [];
  const { trackRef, idx, maxIdx, scrollToIdx, goPrev, goNext, handleScroll } = useCarouselSnap({
    gap: GAP,
    totalItems: enabled ? items.length : 0,
  });

  // Keep hooks unconditional, including when translations change after loading.
  if (!enabled || items.length === 0) return null;

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
                  {Number.isInteger(r.rating) && r.rating >= 1 && r.rating <= 5 && (
                    <div className={styles.testStars} aria-label={t('testimonials.ratingLabel', { count: r.rating })}>{"★".repeat(r.rating)}</div>
                  )}
                  <p className={styles.testText}>{r.text}</p>
                  <div className={styles.testAuthor}>
                    <div className={styles.testAvatar} style={{ background: avBg[i % avBg.length] }}>
                      {r.name.charAt(0)}
                    </div>
                    <div>
                      <div className={styles.testName}>{r.name}</div>
                      {typeof r.role === 'string' && <div className={styles.testRole}>{r.role}</div>}
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
