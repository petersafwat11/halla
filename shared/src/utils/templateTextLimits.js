const TEXT_FIELD_TYPES = new Set(["text", "textarea", "email", "password"]);

// Keep authored artwork readable instead of accepting text that later has to
// shrink to a tiny size, wrap past maxLines, or be clipped by the renderer.
const DEFAULT_TEMPLATE_ASPECT_RATIO = 0.8;
const MIN_READABLE_FONT_SCALE = 0.55;
const AVERAGE_GLYPH_WIDTH_EM = 0.62;

export function getTemplateFieldCapacity(template, fieldKey) {
  const overlay = template?.overlays?.find((item) => item?.fieldKey === fieldKey);
  const widthPct = Number(overlay?.widthPct);
  const fontSizeVh = Number(overlay?.fontSizeVh);
  if (!(widthPct > 0) || !(fontSizeVh > 0)) return null;

  const naturalWidth = Number(template?.naturalWidth);
  const naturalHeight = Number(template?.naturalHeight);
  const aspectRatio =
    naturalWidth > 0 && naturalHeight > 0
      ? naturalWidth / naturalHeight
      : DEFAULT_TEMPLATE_ASPECT_RATIO;
  const maxLines = Math.max(1, Math.floor(Number(overlay?.maxLines) || 1));
  const lineCapacity =
    (widthPct * aspectRatio) /
    (fontSizeVh * AVERAGE_GLYPH_WIDTH_EM * MIN_READABLE_FONT_SCALE);

  return Math.max(1, Math.floor(lineCapacity * maxLines));
}

export function withTemplateTextLimits(template) {
  if (!template) return template;
  const fields = (template.fields || []).map((field) => {
    if (!TEXT_FIELD_TYPES.has(field?.type) || !(Number(field?.maxLength) > 0)) {
      return field;
    }
    const artworkCapacity = getTemplateFieldCapacity(template, field.key);
    if (!artworkCapacity) return field;
    return { ...field, maxLength: Math.min(field.maxLength, artworkCapacity) };
  });
  return { ...template, fields };
}

