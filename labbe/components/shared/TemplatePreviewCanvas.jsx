"use client";
/**
 * TemplatePreviewCanvas — Phase 4c W1-VISUAL
 *
 * Read-only canvas the host sees in StepThree (after picking a template
 * and filling the form) AND the admin sees in "Preview as Host" mode.
 *
 * Renders the background image + decorations + text overlays at the
 * template's natural aspect ratio. Caller hands in `data` (the
 * fieldKey → value map) and we resolve each overlay.fieldKey against
 * it, falling back to the field's labelEn for empty slots.
 *
 * For the admin canvas (drag-resize), wrap each OverlayItem in <Rnd>
 * inside the editor — this component stays stateless.
 */

import React, { forwardRef, useRef, useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import OverlayItem from "./OverlayItem";
import { formatTemplateDate } from "@halla/shared/utils/formatTemplateDate";

const cmpZ = (a, b) => (a.zIndex || 0) - (b.zIndex || 0);

// Render `time`-typed values as "HH:MM" 24h. The form's TimePicker
// stores "HH:MM:AMPM" strings, but template-level defaults like "20:00"
// are already 24h; both must collapse to HH:MM here so RTL pages don't
// flip "AM"/"PM" suffixes (which renders as e.g. "AM:03:00").
function formatFieldValue(field, raw, t) {
  if (raw === undefined || raw === null || raw === "") return null;
  if (field?.type === "time") {
    if (typeof raw === "string") {
      const m12 = raw.match(/^(\d{1,2}):(\d{2}):(AM|PM)$/i);
      if (m12) {
        let h = parseInt(m12[1], 10);
        const isPM = /PM/i.test(m12[3]);
        if (isPM && h < 12) h += 12;
        if (!isPM && h === 12) h = 0;
        return `${String(h).padStart(2, "0")}:${m12[2]}`;
      }
      const m24 = raw.match(/^(\d{1,2}):(\d{2})/);
      if (m24) return `${String(parseInt(m24[1], 10)).padStart(2, "0")}:${m24[2]}`;
      return raw;
    }
    if (raw instanceof Date && !isNaN(raw.getTime())) {
      return `${String(raw.getHours()).padStart(2, "0")}:${String(raw.getMinutes()).padStart(2, "0")}`;
    }
  }
  if (field?.type === "date") {
    return formatTemplateDate(raw, t) || null;
  }
  return typeof raw === "string" ? raw : String(raw);
}

const TemplatePreviewCanvas = forwardRef(function TemplatePreviewCanvas(
  { template, data = {}, primaryColor, fontFamilyOverride, width, style },
  ref
) {
  const { t } = useTranslation("common");
  const innerRef = useRef(null);
  const containerRef = ref || innerRef;
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const el = containerRef.current;
    const update = () => {
      const w = el.clientWidth;
      const ratio =
        template?.naturalWidth && template?.naturalHeight
          ? template.naturalWidth / template.naturalHeight
          : 0.8;
      const h = w / ratio;
      setContainerSize({ width: w, height: h });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [template?.naturalWidth, template?.naturalHeight, containerRef]);

  const imageUrl = useMemo(() => {
    if (!template?.imageUrl) return "";
    if (template.imageUrl.startsWith("blob:") || template.imageUrl.startsWith("data:")) {
      return template.imageUrl;
    }
    return `${template.imageUrl}${template.imageUrl.includes("?") ? "&" : "?"}cors=1`;
  }, [template?.imageUrl]);

  if (!template?.imageUrl) return null;

  const decorations = [...(template.decorations || [])].sort(cmpZ);
  const overlays = [...(template.overlays || [])].sort(cmpZ);
  const fieldsByKey = Object.fromEntries((template.fields || []).map((f) => [f.key, f]));

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: width || "100%",
        aspectRatio:
          template.naturalWidth && template.naturalHeight
            ? `${template.naturalWidth} / ${template.naturalHeight}`
            : "4 / 5",
        backgroundColor: "#fff",
        overflow: "hidden",
        ...style,
      }}
    >
      <img
        src={imageUrl}
        alt=""
        crossOrigin="anonymous"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          pointerEvents: "none",
          userSelect: "none",
        }}
        draggable={false}
      />
      {decorations.map((d, i) => (
        <OverlayItem
          key={`dec-${i}`}
          overlay={d}
          containerWidth={containerSize.width}
          containerHeight={containerSize.height}
          text={d.type === "icon" ? d.source : ""}
          colorOverride={d.color}
          primaryColor={primaryColor}
        />
      ))}
      {overlays.map((o, i) => {
        const field = fieldsByKey[o.fieldKey];
        const raw = data?.[o.fieldKey];
        const formatted = formatFieldValue(field, raw, t);
        const display = formatted !== null ? formatted : (field?.labelEn ?? o.fieldKey);
        return (
          <OverlayItem
            key={`ov-${i}`}
            overlay={o}
            containerWidth={containerSize.width}
            containerHeight={containerSize.height}
            text={display}
            primaryColor={primaryColor}
            fontFamilyOverride={fontFamilyOverride}
          />
        );
      })}
    </div>
  );
});

export default TemplatePreviewCanvas;
