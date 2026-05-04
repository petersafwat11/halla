/**
 * TemplatePreviewCanvas (mobile) — Phase 4c hardening (post-review).
 *
 * React-Native counterpart of the web `TemplatePreviewCanvas.jsx`.
 * Renders the template's background image plus text overlays at the
 * template's natural aspect ratio, so the result can be captured by
 * `react-native-view-shot.captureRef` and uploaded as the WhatsApp
 * header image.
 *
 * Wrap this in `<ViewShot>` from `react-native-view-shot`:
 *
 *   const ref = useRef(null);
 *   <ViewShot ref={ref} options={{ format: "png", quality: 0.95 }}>
 *     <TemplatePreviewCanvas template={tpl} data={values} />
 *   </ViewShot>
 *   const baked = await bakeCanvas(ref, {
 *     width: tpl.naturalWidth,
 *     height: tpl.naturalHeight,
 *   });
 *
 * Mirrors the web component's overlay coordinate system: positions are
 * percentages of natural image dimensions; OverlayItem positions
 * absolutely with a `translate(-50%, -50%)` centering offset.
 */

import React, { useState } from "react";
import { View, Image, Text, StyleSheet } from "react-native";

const cmpZ = (a, b) => (a.zIndex || 0) - (b.zIndex || 0);

const FONT_FAMILY_MAP = {
  cairo: "Cairo_400Regular",
  cairo_bold: "Cairo_700Bold",
  inter: undefined, // system fallback
  lato: undefined,
  amiri: undefined,
  ibm_plex_arabic: undefined,
  noto_sans_arabic: undefined,
};

function resolveFontFamily(name, fontWeight) {
  if (!name) return undefined;
  if (name === "cairo" && (fontWeight === "bold" || fontWeight === "700")) {
    return FONT_FAMILY_MAP.cairo_bold;
  }
  return FONT_FAMILY_MAP[name];
}

function OverlayItem({ overlay, containerWidth, containerHeight, text, primaryColor }) {
  const left = (overlay.leftPct / 100) * containerWidth;
  const top = (overlay.topPct / 100) * containerHeight;
  const width = overlay.widthPct
    ? (overlay.widthPct / 100) * containerWidth
    : undefined;
  const height = overlay.heightPct
    ? (overlay.heightPct / 100) * containerHeight
    : undefined;
  const fontSize = overlay.fontSizeVh
    ? Math.max(8, (overlay.fontSizeVh / 100) * containerHeight)
    : 14;

  const color =
    overlay.colorBinding === "custom"
      ? overlay.color || "#000"
      : primaryColor || "#5a4a42";

  // Approximate web `transform: translate(-50%, -50%)` by offsetting
  // top-left by half the resolved width/height. When width/height are
  // unspecified, fall back to centering the text via textAlign + a
  // small translate which RN handles via `transform: [{ translateX,
  // translateY }]`.
  const wrapperStyle = {
    position: "absolute",
    left: width != null ? left - width / 2 : left,
    top: height != null ? top - height / 2 : top,
    width,
    height,
    justifyContent: "center",
    alignItems: overlay.textAlign === "left" ? "flex-start" : overlay.textAlign === "right" ? "flex-end" : "center",
    zIndex: overlay.zIndex || 0,
  };

  const textStyle = {
    color,
    fontSize,
    fontWeight: overlay.fontWeight || "normal",
    fontFamily: resolveFontFamily(overlay.fontFamily, overlay.fontWeight),
    textAlign: overlay.textAlign || "center",
  };

  return (
    <View pointerEvents="none" style={wrapperStyle}>
      <Text style={textStyle} numberOfLines={2}>{text}</Text>
    </View>
  );
}

export default function TemplatePreviewCanvas({
  template,
  data = {},
  primaryColor,
  width: widthProp,
}) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  if (!template?.imageUrl) return null;

  const overlays = [...(template.overlays || [])].sort(cmpZ);
  const fieldsByKey = Object.fromEntries(
    (template.fields || []).map((f) => [f.key, f])
  );

  const aspectRatio =
    template.naturalWidth && template.naturalHeight
      ? template.naturalWidth / template.naturalHeight
      : 4 / 5;

  const width = widthProp || containerSize.width || 320;
  const height = width / aspectRatio;

  return (
    <View
      onLayout={(e) => {
        const { width: w } = e.nativeEvent.layout;
        if (w !== containerSize.width) {
          setContainerSize({ width: w, height: w / aspectRatio });
        }
      }}
      style={[styles.container, { width: widthProp || "100%", aspectRatio }]}
    >
      <Image
        source={{ uri: template.imageUrl }}
        style={styles.bgImage}
        resizeMode="cover"
      />
      {overlays.map((o, i) => {
        const field = fieldsByKey[o.fieldKey];
        const raw = data?.[o.fieldKey];
        const display =
          raw !== undefined && raw !== null && raw !== ""
            ? typeof raw === "string"
              ? raw
              : String(raw)
            : (field?.labelAr ?? field?.labelEn ?? o.fieldKey);
        return (
          <OverlayItem
            key={`ov-${i}`}
            overlay={o}
            containerWidth={width}
            containerHeight={height}
            text={display}
            primaryColor={primaryColor}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    backgroundColor: "#F5F5F5",
    overflow: "hidden",
  },
  bgImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
});
