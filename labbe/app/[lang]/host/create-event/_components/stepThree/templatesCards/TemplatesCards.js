"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { FaCheckCircle } from "react-icons/fa";
import styles from "./templatesCards.module.css";
import UseLanguageChange from "@/hooks/UseLanguageChange";

const GAP = 14;

const TemplatesCards = ({ templates, selectedTemplate, onTemplateSelect }) => {
  const { currentLocale } = UseLanguageChange();
  const isAr = currentLocale === "ar";
  const trackRef = useRef(null);
  const throttleRef = useRef(false);
  const [idx, setIdx] = useState(0);
  const maxIdx = Math.max(0, templates.length - 1);

  const stepSize = () => {
    const el = trackRef.current;
    const cardW = el?.firstElementChild?.offsetWidth || 0;
    return cardW + GAP;
  };

  const scrollToIdx = (i) => {
    const el = trackRef.current;
    if (!el) return;
    const clamped = Math.min(Math.max(0, i), maxIdx);
    el.scrollTo({ left: clamped * stepSize(), behavior: "smooth" });
    setIdx(clamped);
  };

  const prev = () => scrollToIdx(idx - 1);
  const next = () => scrollToIdx(idx + 1);

  const handleScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const step = stepSize();
    if (step > 0) {
      setIdx(Math.min(Math.max(0, Math.round(el.scrollLeft / step)), maxIdx));
    }
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      if (throttleRef.current) return;
      throttleRef.current = true;
      setTimeout(() => {
        throttleRef.current = false;
      }, 420);
      const delta = (e.deltaY || e.deltaX) > 0 ? 1 : -1;
      const step = stepSize();
      const cur = step > 0 ? Math.round(el.scrollLeft / step) : 0;
      const nxt = Math.min(Math.max(0, cur + delta), maxIdx);
      el.scrollTo({ left: nxt * step, behavior: "smooth" });
      setIdx(nxt);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [maxIdx]);

  if (templates.length === 0) return null;

  return (
    <div className={styles.carouselWrapper}>
      <div
        className={styles.templatesTrack}
        ref={trackRef}
        onScroll={handleScroll}
        dir="ltr"
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
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.ctrlBtn}
            onClick={isAr ? next : prev}
            disabled={isAr ? idx >= maxIdx : idx <= 0}
            aria-label={isAr ? "التالي" : "Previous"}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path
                d={isAr ? "M8 5l5 5-5 5" : "M12 5l-5 5 5 5"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div className={styles.dots}>
            {templates.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`${styles.dot} ${
                  i === idx ? styles.dotActive : ""
                }`}
                onClick={() => scrollToIdx(i)}
                aria-label={`${i + 1}`}
              />
            ))}
          </div>
          <button
            type="button"
            className={styles.ctrlBtn}
            onClick={isAr ? prev : next}
            disabled={isAr ? idx <= 0 : idx >= maxIdx}
            aria-label={isAr ? "السابق" : "Next"}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path
                d={isAr ? "M12 5l-5 5 5 5" : "M8 5l5 5-5 5"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default TemplatesCards;
