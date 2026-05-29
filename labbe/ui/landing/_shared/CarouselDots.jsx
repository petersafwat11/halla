"use client";
import React from "react";

/**
 * Shared prev/dots/next control bar used by landing carousels.
 *
 * The bar is locked to `dir="ltr"` so the left chevron is always Previous and
 * the right chevron is always Next, regardless of page language — matches the
 * visual convention used everywhere on the site.
 *
 * Pass the host component's CSS-module classes via `classes` so the visual
 * styling stays per-component.
 */
export default function CarouselDots({
  idx,
  maxIdx,
  onChange,
  onPrev,
  onNext,
  isAr = false,
  visibleDots = null,
  classes,
  prevLabel,
  nextLabel,
  dotRole,
}) {
  const handlePrev = onPrev || (() => onChange(idx - 1));
  const handleNext = onNext || (() => onChange(idx + 1));
  let dotIndices;
  if (visibleDots) {
    const half = Math.floor(visibleDots / 2);
    const dotsLen = Math.min(visibleDots, maxIdx + 1);
    const windowStart = Math.min(
      Math.max(0, idx - half),
      Math.max(0, maxIdx - dotsLen + 1),
    );
    dotIndices = Array.from({ length: dotsLen }, (_, i) => windowStart + i);
  } else {
    dotIndices = Array.from(
      { length: Math.max(1, maxIdx + 1) },
      (_, i) => i,
    );
  }

  return (
    <div className={classes.controls} dir="ltr">
      <button
        type="button"
        className={classes.ctrlBtn}
        onClick={handlePrev}
        disabled={idx <= 0}
        aria-label={prevLabel || (isAr ? "السابق" : "Previous")}
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <path
            d="M12 5l-5 5 5 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className={classes.dots} role={dotRole === "tablist" ? "tablist" : undefined}>
        {dotIndices.map((i) => (
          <button
            key={i}
            type="button"
            role={dotRole === "tablist" ? "tab" : undefined}
            aria-selected={dotRole === "tablist" ? i === idx : undefined}
            className={`${classes.dot}${i === idx ? ` ${classes.dotActive}` : ""}`}
            onClick={() => onChange(i)}
            aria-label={`${i + 1}`}
          />
        ))}
      </div>

      <button
        type="button"
        className={classes.ctrlBtn}
        onClick={handleNext}
        disabled={idx >= maxIdx}
        aria-label={nextLabel || (isAr ? "التالي" : "Next")}
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <path
            d="M8 5l5 5-5 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
