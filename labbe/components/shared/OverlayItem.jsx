"use client";
/**
 * OverlayItem — Phase 4c W1-VISUAL
 *
 * Per v4.1 §A-3 (coordinate system). Renders a single overlay (text
 * field or decoration) absolutely positioned by % of natural image
 * dimensions. The container size is the rendered image's pixel size.
 *
 * Sort overlays + decorations by `zIndex ASC` then array order on the
 * caller side; this component is dumb about ordering.
 */

import React from "react";
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

  const color =
    overlay.colorBinding === "custom"
      ? overlay.color || "#000"
      : colorOverride || primaryColor || "#5a4a42";

  return (
    <div
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
