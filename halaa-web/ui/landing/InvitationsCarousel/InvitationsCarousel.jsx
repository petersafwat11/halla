"use client";
import React from "react";
import Image from "next/image";
import styles from "./invitationsCarousel.module.css";
import { useTranslation } from "react-i18next";
import useCarouselSnap from "../_shared/useCarouselSnap";
import CarouselDots from "../_shared/CarouselDots";

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

const VISIBLE_DOTS = 7;

const InvitationsCarousel = ({ lang = "ar" }) => {
  const { t } = useTranslation("landing");
  const { trackRef, idx, maxIdx, scrollToIdx, goPrev, goNext, handleScroll } = useCarouselSnap({
    gap: 48,
    totalItems: TEMPLATE_IMAGES.length,
    captureWheel: false,
  });

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
          tabIndex={0}
          role="region"
          aria-label={t('invitations.title')}
          onScroll={handleScroll}
        >
          {TEMPLATE_IMAGES.map((file, i) => (
            <div key={i} className={styles.invitationCard}>
              <Image
                src={`/template-card-thumbnails/${file.replace(/\.(png|jpe?g)$/i, ".webp")}`}
                alt={t(`invitations.imageAlts.${i}`)}
                width={208}
                height={288}
                sizes="(max-width: 480px) 138px, (max-width: 768px) 164px, 208px"
                loading="lazy"
                decoding="async"
                draggable={false}
                quality={78}
              />
            </div>
          ))}
        </div>

        <CarouselDots
          idx={idx}
          maxIdx={maxIdx}
          onChange={scrollToIdx}
          onPrev={goPrev}
          onNext={goNext}
          visibleDots={VISIBLE_DOTS}
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

export default InvitationsCarousel;
