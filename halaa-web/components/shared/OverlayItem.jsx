"use client";
/**
 * OverlayItem
 *
 * Renders a single overlay (text field or decoration) absolutely
 * positioned by % of natural image dimensions. The container size is the
 * rendered image's pixel size.
 *
 * Sort overlays + decorations by `zIndex ASC` then array order on the
 * caller side; this component is dumb about ordering.
 */

import React, { useLayoutEffect, useRef } from "react";
import { renderIconByName } from "@/app/[lang]/admin-dash/templates/_components/IconPicker";

export function OverlayItem({
  overlay,
  containerWidth,
  containerHeight,
  text,
  fontFamilyOverride,
  colorOverride,
  primaryColor,
  selected = false,
  onClick,
  dir,
  style,
}) {
  const left = (overlay.leftPct / 100) * containerWidth;
  const top = (overlay.topPct / 100) * containerHeight;
  const width = overlay.widthPct ? (overlay.widthPct / 100) * containerWidth : "auto";
  const fontSize = overlay.fontSizeVh
    ? (overlay.fontSizeVh / 100) * containerHeight
    : overlay.iconSizeVh
      ? (overlay.iconSizeVh / 100) * containerHeight
      : 14;

  // An explicit host choice must win for text, including templates whose
  // original overlays carry a custom readability colour. Decorations pass a
  // colorOverride, so their artwork colour remains template-controlled.
  const color =
    colorOverride ||
    primaryColor ||
    (overlay.colorBinding === "custom" ? overlay.color || "#000" : "#5a4a42");

  const textRef = useRef(null);
  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element || overlay.type === "icon" || !overlay.maxLines || !text || typeof width !== "number" || width <= 0) return;
    let cancelled = false;
    const fit = () => {
      if (cancelled) return;
      // Measure the full text, then fit within the authored line budget.
      // Clamping alone silently removed venue/name text from exported cards.
      element.style.WebkitLineClamp = "unset";
      element.style.overflow = "visible";
      let low = fontSize * 0.35;
      let high = fontSize;
      const fits = size => {
        element.style.fontSize = `${size}px`;
        // scrollHeight includes font glyph overhang (not just line boxes),
        // which would shrink fonts such as Cairo/Amiri even on a single line.
        return element.clientHeight <= size * (overlay.lineHeight || 1.35) * overlay.maxLines + 1;
      };
      if (fits(high)) low = high;
      else for (let i = 0; i < 10; i++) {
        const mid = (low + high) / 2;
        if (fits(mid)) low = mid; else high = mid;
      }
      element.style.fontSize = `${low}px`;
    };
    fit();
    document.fonts?.ready.then(fit);
    return () => { cancelled = true; };
  }, [text, width, fontSize, overlay.maxLines, overlay.lineHeight, overlay.type, overlay.fontWeight, overlay.fontFamily, fontFamilyOverride]);

  return (
    <div
      ref={textRef}
      onClick={onClick}
      style={{
        position: "absolute",
        left,
        top,
        width,
        transform: "translate(-50%, -50%)",
        textAlign: overlay.textAlign || "center",
        fontFamily: fontFamilyOverride || overlay.fontFamily || "inherit",
        fontWeight: overlay.fontWeight || "normal",
        lineHeight: overlay.lineHeight || 1.35,
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        direction: dir && dir !== "auto" ? dir : undefined,
        ...(overlay.maxLines
          ? {
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: overlay.maxLines,
              overflow: "hidden",
            }
          : {}),
        color,
        fontSize,
        zIndex: overlay.zIndex || 0,
        outline: selected ? "2px solid #c28e5c" : "none",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {overlay.type === "icon" && text
        ? renderIconByName(text, { size: fontSize, color, strokeWidth: 1.5 })
        : text}
    </div>
  );
}

export default OverlayItem;
