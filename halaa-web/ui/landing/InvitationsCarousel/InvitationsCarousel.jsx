"use client";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

// Intrinsic size of every /template-cards artwork (portrait 500×889).
const TEMPLATE_CARD_WIDTH = 500;
const TEMPLATE_CARD_HEIGHT = 889;

const VISIBLE_DOTS = 7;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const InvitationsCarousel = ({ lang = "ar" }) => {
  const { t } = useTranslation("landing");
  const [previewIndex, setPreviewIndex] = useState(null);
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const openerRef = useRef(null);
  const { trackRef, idx, maxIdx, scrollToIdx, goPrev, goNext, handleScroll } = useCarouselSnap({
    gap: 48,
    totalItems: TEMPLATE_IMAGES.length,
    captureWheel: false,
  });

  const isPreviewOpen = previewIndex !== null;

  useEffect(() => {
    if (!isPreviewOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // The dialog is portalled to <body>; make everything else inert so
    // keyboard and screen-reader focus cannot reach the page behind it.
    const inertedElements = Array.from(document.body.children).filter(
      (element) => element !== overlayRef.current && !element.hasAttribute("inert")
    );
    inertedElements.forEach((element) => element.setAttribute("inert", ""));

    closeButtonRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setPreviewIndex(null);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      inertedElements.forEach((element) => element.removeAttribute("inert"));
      document.removeEventListener("keydown", onKeyDown);
      openerRef.current?.focus({ preventScroll: true });
    };
  }, [isPreviewOpen]);

  const openPreview = (index, event) => {
    openerRef.current = event.currentTarget;
    setPreviewIndex(index);
  };

  const previewFile = isPreviewOpen ? TEMPLATE_IMAGES[previewIndex] : null;

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
            <button
              key={file}
              type="button"
              className={styles.invitationCard}
              onClick={(event) => openPreview(i, event)}
              aria-haspopup="dialog"
              aria-label={t("invitations.previewCard", { number: i + 1 })}
            >
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
            </button>
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

      {previewFile && createPortal(
        <div
          ref={overlayRef}
          className={styles.previewOverlay}
          role="presentation"
          dir={lang === "ar" ? "rtl" : "ltr"}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPreviewIndex(null);
          }}
        >
          <div
            ref={dialogRef}
            className={styles.previewDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="landing-template-preview-title"
          >
            <header className={styles.previewHeader}>
              <h3 id="landing-template-preview-title">
                {t("invitations.previewTitle")}
              </h3>
              <button
                ref={closeButtonRef}
                type="button"
                className={styles.previewClose}
                onClick={() => setPreviewIndex(null)}
                aria-label={t("invitations.closePreview")}
              >
                <span aria-hidden="true">×</span>
              </button>
            </header>
            <div className={styles.previewBody}>
              <Image
                src={`/template-cards/${previewFile}`}
                alt={t(`invitations.imageAlts.${previewIndex}`)}
                width={TEMPLATE_CARD_WIDTH}
                height={TEMPLATE_CARD_HEIGHT}
                sizes="(max-width: 520px) 92vw, 460px"
                className={styles.previewImage}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
};

export default InvitationsCarousel;
