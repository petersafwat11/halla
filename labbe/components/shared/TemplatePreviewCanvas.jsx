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

import React, { forwardRef, useRef, useEffect, useState } from "react";
import OverlayItem from "./OverlayItem";

const cmpZ = (a, b) => (a.zIndex || 0) - (b.zIndex || 0);

const TemplatePreviewCanvas = forwardRef(function TemplatePreviewCanvas(
  { template, data = {}, primaryColor, fontFamilyOverride, width, style },
  ref
) {
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
        background: `url(${template.imageUrl}) center/cover no-repeat`,
        ...style,
      }}
    >
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
        const display =
          raw !== undefined && raw !== null && raw !== ""
            ? typeof raw === "string"
              ? raw
              : String(raw)
            : (field?.labelEn ?? o.fieldKey);
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
