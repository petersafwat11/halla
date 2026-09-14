import { UPLOAD_LIMITS } from "../constants/uploadLimits.js";

const positive = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

/** Scale artwork so its long side never exceeds `maxDimension` (never upscales). */
export function boundInvitationDimensions({
  width,
  height,
  maxDimension = UPLOAD_LIMITS.INVITATION_MAX_DIMENSION,
} = {}) {
  const w = positive(width);
  const h = positive(height);
  if (!w || !h) return null;
  const scale = Math.min(1, maxDimension / Math.max(w, h));
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
    scale,
  };
}

/**
 * Canvas scale that renders an on-screen template preview at the template's
 * bounded natural size. Falls back to `fallbackScale` × rendered size when the
 * template has no natural dimensions; the result is always bounded.
 */
export function computeTemplateCaptureScale({
  renderedWidth,
  renderedHeight,
  naturalWidth,
  naturalHeight,
  maxDimension = UPLOAD_LIMITS.INVITATION_MAX_DIMENSION,
  fallbackScale = 2,
} = {}) {
  const rw = positive(renderedWidth);
  const rh = positive(renderedHeight);
  if (!rw || !rh) return null;
  const renderedLong = Math.max(rw, rh);
  const natural = boundInvitationDimensions({ width: naturalWidth, height: naturalHeight, maxDimension });
  const targetLong = natural
    ? Math.max(natural.width, natural.height)
    : Math.min(maxDimension, renderedLong * fallbackScale);
  return targetLong / renderedLong;
}

/** True when an encoded image already satisfies the invitation upload contract. */
export function canSkipInvitationReencode({
  type,
  width,
  height,
  bytes,
  maxDimension = UPLOAD_LIMITS.INVITATION_MAX_DIMENSION,
  targetBytes = UPLOAD_LIMITS.CLIENT_INVITATION_TARGET_BYTES,
} = {}) {
  const mime = String(type || "").toLowerCase();
  if (mime !== "image/jpeg" && mime !== "image/jpg") return false;
  const w = positive(width);
  const h = positive(height);
  const size = positive(bytes);
  if (!w || !h || !size) return false;
  return Math.max(w, h) <= maxDimension && size <= targetBytes;
}

export const TEMPLATE_BAKE_ERROR = Object.freeze({
  BACKGROUND: "TEMPLATE_BACKGROUND_LOAD_FAILED",
  CAPTURE: "TEMPLATE_CAPTURE_FAILED",
  ENCODE: "INVITATION_IMAGE_ENCODE_FAILED",
  TOO_LARGE: "EVENT_IMAGE_TOO_LARGE",
});

/** Attach a bake error code without discarding the original error. */
export function tagTemplateBakeError(error, code) {
  const tagged = error instanceof Error ? error : new Error(String(error || code));
  if (!tagged.code) tagged.code = code;
  return tagged;
}

/** Localization key (createEvent namespace) for a failed template bake. */
export function templateBakeErrorKey(error) {
  const text = `${error?.code || ""} ${error?.message || (typeof error === "string" ? error : "")}`.toUpperCase();
  if (text.includes("TEMPLATE_BACKGROUND") || text.includes("IMAGE-LOAD-FAILED")) {
    return "template_background_failed";
  }
  if (text.includes("TOO_LARGE")) return "template_image_too_large";
  if (text.includes("ENCODE") || text.includes("DECODE") || text.includes("CANVAS_UNAVAILABLE")) {
    return "template_encode_failed";
  }
  if (text.includes("TEMPLATE_CAPTURE")) return "template_capture_failed";
  return "template_bake_failed";
}

/** Share one in-flight run: repeated calls while busy never start a second task. */
export function createSingleFlight() {
  let current = null;
  return {
    get busy() {
      return current !== null;
    },
    run(task) {
      if (current) return current;
      current = Promise.resolve()
        .then(task)
        .finally(() => {
          current = null;
        });
      return current;
    },
  };
}
