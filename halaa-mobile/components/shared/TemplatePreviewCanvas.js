/**
 * TemplatePreviewCanvas (mobile).
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
 * Overlay coordinate system: positions are percentages of natural image
 * dimensions; OverlayItem positions absolutely with a
 * `translate(-50%, -50%)` centering offset.
 */

import React, { useEffect, useState, useMemo } from "react";
import { View, Image, Text, StyleSheet } from "react-native";
import * as LucideIcons from "lucide-react-native";
import { useTranslation } from "../../localization";
import { formatTemplateDate } from "@halaa/shared/utils/formatTemplateDate";
import { resolveTemplateFont } from "../../utils/cairoFont";
import { ENDPOINTS } from "../../config/api";
import { resolveMediaUri } from "../../utils/resolveMediaUri";
import { useAuthStore } from "../../stores/authStore";

const cmpZ = (a, b) => (a.zIndex || 0) - (b.zIndex || 0);

// Render `time`-typed values as "HH:MM" 24h.
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

// Every template font id renders in Cairo now (incl. legacy non-Cairo ids
// like inter/lato/amiri). Always returns a loaded Cairo variant, never
// undefined, so old templates keep rendering without a system fallback.
function resolveFontFamily(name, fontWeight) {
  return resolveTemplateFont(name, fontWeight);
}

function sourceWithAuth(uri, token) {
  if (!uri) return null;
  if (!/^https?:/i.test(uri) || !token) return { uri };
  return {
    uri,
    headers: { Authorization: `Bearer ${token}`, "X-Client": "mobile" },
  };
}

function getBackgroundSource(template, token) {
  if (!template) return null;
  if (template.src) {
    if (typeof template.src === "number") return template.src;
    if (template.src.uri) return sourceWithAuth(resolveMediaUri(template.src.uri), token);
  }
  const templateId = String(template._id || template.id || "");
  const isDatabaseTemplate = /^[a-f\d]{24}$/i.test(templateId);

  const raw =
    template.previewImageUrl ||
    template.imageUrl ||
    template.thumbnailUrl ||
    (isDatabaseTemplate ? ENDPOINTS.TEMPLATES.ASSET(templateId) : null);

  if (!raw) {
    if (template.fallbackSource) return template.fallbackSource;
    return null;
  }

  const uri = resolveMediaUri(raw);
  return uri ? sourceWithAuth(uri, token) : (template.fallbackSource || null);
}

function getFallbackSource(template, token) {
  if (!template) return null;
  if (template.fallbackSource) return template.fallbackSource;
  if (template.thumbnailUrl) {
    const uri = resolveMediaUri(template.thumbnailUrl);
    if (uri) return sourceWithAuth(uri, token);
  }
  return null;
}

function DecorationItem({ decoration, containerWidth, containerHeight, primaryColor, token }) {
  const left = (decoration.leftPct / 100) * containerWidth;
  const top = (decoration.topPct / 100) * containerHeight;
  const iconSize = decoration.iconSizeVh
    ? Math.max(8, (decoration.iconSizeVh / 100) * containerHeight)
    : 24;
  const color = decoration.color || primaryColor || "#5a4a42";

  const wrapperStyle = {
    position: "absolute",
    left,
    top,
    zIndex: decoration.zIndex || 0,
    transform: [{ translateX: -iconSize / 2 }, { translateY: -iconSize / 2 }],
  };

  if (decoration.type === "image") {
    const imgSize = decoration.widthPct
      ? (decoration.widthPct / 100) * containerWidth
      : iconSize;
    const uri = resolveMediaUri(decoration.source);
    const source =
      typeof decoration.source === "number"
        ? decoration.source
        : uri
          ? sourceWithAuth(uri, token)
          : null;
    if (!source) return null;
    return (
      <View pointerEvents="none" style={[wrapperStyle, { transform: [{ translateX: -imgSize / 2 }, { translateY: -imgSize / 2 }] }]}>
        <Image source={source} style={{ width: imgSize, height: imgSize }} resizeMode="contain" />
      </View>
    );
  }

  if (decoration.type === "icon") {
    const IconComponent = LucideIcons[decoration.source];
    if (!IconComponent) return null;
    return (
      <View pointerEvents="none" style={wrapperStyle}>
        <IconComponent size={iconSize} color={color} strokeWidth={1.5} />
      </View>
    );
  }

  return null;
}

function OverlayItem({ overlay, containerWidth, containerHeight, text, primaryColor }) {
  const left = (overlay.leftPct / 100) * containerWidth;
  const top = (overlay.topPct / 100) * containerHeight;
  const width = overlay.widthPct
    ? (overlay.widthPct / 100) * containerWidth
    : undefined;
  const fontSize = overlay.fontSizeVh
    ? Math.max(8, (overlay.fontSizeVh / 100) * containerHeight)
    : 14;

  const color =
    overlay.colorBinding === "custom"
      ? overlay.color || "#000"
      : primaryColor || "#5a4a42";

  const wrapperStyle = {
    position: "absolute",
    left: width != null ? left - width / 2 : left,
    top: top,
    width,
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
  onBackgroundReady,
  onBackgroundError,
}) {
  const { t } = useTranslation("common");
  const token = useAuthStore((state) => state.token);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const primarySource = useMemo(() => getBackgroundSource(template, token), [template, token]);
  const fallbackSource = useMemo(() => getFallbackSource(template, token), [template, token]);
  const [currentSource, setCurrentSource] = useState(primarySource);

  useEffect(() => {
    setCurrentSource(primarySource);
    if (typeof primarySource === "number") {
      onBackgroundReady?.(true);
    } else if (!primarySource) {
      onBackgroundReady?.(false);
      onBackgroundError?.(new Error("TEMPLATE_BACKGROUND_MISSING"));
    } else {
      onBackgroundReady?.(false);
    }
  }, [primarySource, onBackgroundReady, onBackgroundError]);

  if (!template) return null;

  const decorations = [...(template.decorations || [])].sort(cmpZ);
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
      {currentSource ? (
        <Image
          source={currentSource}
          style={styles.bgImage}
          resizeMode="cover"
          onLoad={() => onBackgroundReady?.(true)}
          onError={(event) => {
            if (fallbackSource && currentSource !== fallbackSource) {
              onBackgroundReady?.(false);
              setCurrentSource(fallbackSource);
            } else {
              onBackgroundReady?.(false);
              onBackgroundError?.(
                new Error(
                  event?.nativeEvent?.error || "TEMPLATE_BACKGROUND_LOAD_FAILED"
                )
              );
            }
          }}
        />
      ) : null}
      {decorations.map((d, i) => (
        <DecorationItem
          key={`dec-${i}`}
          decoration={d}
          containerWidth={width}
          containerHeight={height}
          primaryColor={primaryColor}
          token={token}
        />
      ))}
      {overlays.map((o, i) => {
        const field = fieldsByKey[o.fieldKey];
        const raw = data?.[o.fieldKey];
        const formatted = formatFieldValue(field, raw, t);
        const display = formatted !== null ? formatted : (field?.labelAr ?? field?.labelEn ?? o.fieldKey);
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
