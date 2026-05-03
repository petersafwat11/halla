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
  style,
}) {
  const left = (overlay.leftPct / 100) * containerWidth;
  const top = (overlay.topPct / 100) * containerHeight;
  const width = overlay.widthPct ? (overlay.widthPct / 100) * containerWidth : "auto";
  const height = overlay.heightPct ? (overlay.heightPct / 100) * containerHeight : "auto";
  const fontSize = overlay.fontSizeVh ? (overlay.fontSizeVh / 100) * containerHeight : 14;

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
        height,
        transform: "translate(-50%, -50%)",
        textAlign: overlay.textAlign || "center",
        fontFamily: fontFamilyOverride || overlay.fontFamily || "inherit",
        fontWeight: overlay.fontWeight || "normal",
        color,
        fontSize,
        zIndex: overlay.zIndex || 0,
        outline: selected ? "2px solid #c28e5c" : "none",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {text}
    </div>
  );
}

export default OverlayItem;
