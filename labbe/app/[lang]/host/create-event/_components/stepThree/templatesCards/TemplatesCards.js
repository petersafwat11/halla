"use client";
import React from "react";
import Image from "next/image";
import { FaCheckCircle } from "react-icons/fa";
import styles from "./templatesCards.module.css";
import UseLanguageChange from "@/hooks/UseLanguageChange";
import useCarouselSnap from "@/ui/landing/_shared/useCarouselSnap";
import CarouselDots from "@/ui/landing/_shared/CarouselDots";

const GAP = 14;

const TemplatesCards = ({ templates, selectedTemplate, onTemplateSelect }) => {
  const { currentLocale } = UseLanguageChange();
  const isAr = currentLocale === "ar";
  const { trackRef, idx, maxIdx, scrollToIdx, goPrev, goNext, handleScroll } = useCarouselSnap({
    gap: GAP,
    totalItems: templates.length,
  });

  if (templates.length === 0) return null;

  return (
    <div className={styles.carouselWrapper}>
      <div
        className={styles.templatesTrack}
        ref={trackRef}
        onScroll={handleScroll}
      >
        {templates.map((template) => {
          const isSelected =
            (selectedTemplate?.id && selectedTemplate.id === template.id) ||
            (selectedTemplate?._id && selectedTemplate._id === template._id);

          const src = template.thumbnailUrl || template.src || template.imageUrl;
          const alt = template.name || `Template ${template.id || template._id}`;

          return (
            <div
              key={template.id || template._id}
              className={`${styles.templateCard} ${
                isSelected ? styles.selected : ""
              }`}
              onClick={() => onTemplateSelect(template)}
            >
              <div className={styles.templateCardInner}>
                {isSelected && (
                  <div className={styles.checkmark}>
                    <FaCheckCircle />
                  </div>
                )}
                {src ? (
                  <Image
                    src={src}
                    alt={alt}
                    width={129}
                    height={172}
                    className={styles.templateImage}
                    unoptimized={
                      src.startsWith("blob:") || src.startsWith("data:")
                    }
                  />
                ) : (
                  <div
                    className={styles.templateImage}
                    style={{ width: 129, height: 172, background: "#eee" }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {templates.length > 1 && (
        <CarouselDots
          idx={idx}
          maxIdx={maxIdx}
          onChange={scrollToIdx}
          onPrev={goPrev}
          onNext={goNext}
          isAr={isAr}
          classes={{
            controls: styles.controls,
            ctrlBtn: styles.ctrlBtn,
            dots: styles.dots,
            dot: styles.dot,
            dotActive: styles.dotActive,
          }}
        />
      )}
    </div>
  );
};

export default TemplatesCards;
