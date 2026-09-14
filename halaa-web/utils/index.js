import { getMediaUrl as _getMediaUrlShared } from "@halaa/shared/utils/media";

/**
 * Web wrapper around `@halaa/shared/utils/media#getMediaUrl`. Reads the
 * Next.js public env var so call sites keep the original
 * `(pathOrUrl, fallback)` signature.
 *
 * @param {string|File|Blob|null|undefined} pathOrUrl
 * @param {string} [fallback]
 * @returns {string}
 */
export function getMediaUrl(pathOrUrl, fallback = "") {
  return _getMediaUrlShared(pathOrUrl, {
    fallback,
    staticAssetBaseUrl: (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/$/, ""),
  });
}

const CAPTURE_DOCUMENT_TAGS = new Set(["HEAD", "STYLE", "LINK", "META", "TITLE", "BASE"]);
const CAPTURE_ROOT_ATTRIBUTE = "data-capture-root";

/**
 * `html2canvas` clones the whole document and reads computed styles for every
 * cloned node before rendering the target. With `captureOnly`, the clone keeps
 * only document styles, the target's ancestors and the target subtree, which
 * is what dominated template Save time.
 */
export function shouldIgnoreForCapture(element, target, captureOnly = false) {
  const tag = element?.tagName;
  if (tag === "SCRIPT" || tag === "NOSCRIPT") return true;
  // Editor-only field labels must never be baked into the invitation.
  if (element?.hasAttribute?.("data-template-placeholder")) return true;
  if (!captureOnly || !target) return false;
  if (CAPTURE_DOCUMENT_TAGS.has(tag)) return false;
  return !(element === target || element.contains(target) || target.contains(element));
}

/**
 * Capture a DOM ref with `html2canvas` and encode it straight to a File
 * (JPEG by default). We deliberately do NOT set `allowTaint: true` — pairing
 * it with `useCORS` produces a tainted canvas when the source bucket lacks
 * CORS, which then silently bakes a partial image (text only, no background)
 * and makes `canvas.toBlob` return null. Strict CORS-only loading surfaces the
 * underlying media-server misconfiguration as a clear error instead of shipping a
 * broken file downstream.
 *
 * `pinSize` fixes the cloned target to the live layout size: html2canvas
 * re-lays the clone out in its own iframe, where viewport-relative sizing can
 * resize the target while pixel-positioned children stay put.
 *
 * Returns the File, or `{ file, blob, width, height }` with `returnBlob`.
 */
export async function htmlToImageConvert(
  imageRef,
  fileName = "template-image",
  options = {}
) {
  const {
    autoDownload = false,
    returnBlob = false,
    scale = 2,
    type = "image/jpeg",
    quality = 0.9,
    captureOnly = false,
    pinSize,
    renderer,
  } = options;
  const target = imageRef?.current;
  if (!target) throw new Error("Nothing to capture");
  const html2canvas = renderer || (await import("html2canvas")).default;
  const extension = type === "image/png" ? "png" : "jpg";

  let canvas;
  if (pinSize) target.setAttribute?.(CAPTURE_ROOT_ATTRIBUTE, "");
  try {
    canvas = await html2canvas(target, {
      useCORS: true,
      backgroundColor: "#ffffff",
      scale,
      logging: false,
      ignoreElements: (element) => shouldIgnoreForCapture(element, target, captureOnly),
      onclone: pinSize
        ? (clonedDocument) => {
            const clone = clonedDocument.querySelector(`[${CAPTURE_ROOT_ATTRIBUTE}]`);
            if (!clone) return;
            Object.assign(clone.style, {
              width: `${pinSize.width}px`,
              height: `${pinSize.height}px`,
              maxWidth: "none",
              aspectRatio: "auto",
            });
          }
        : undefined,
    });
    const width = canvas.width;
    const height = canvas.height;
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) =>
          result ? resolve(result) : reject(new Error("INVITATION_IMAGE_ENCODE_FAILED")),
        type,
        quality
      );
    });
    const file = new File([blob], `${fileName}.${extension}`, {
      type,
      lastModified: Date.now(),
    });

    if (autoDownload) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = file.name;
      link.href = url;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }

    return returnBlob ? { file, blob, width, height } : file;
  } catch (err) {
    console.error("Error converting HTML to image:", err);
    throw err;
  } finally {
    if (pinSize) target.removeAttribute?.(CAPTURE_ROOT_ATTRIBUTE);
    // Release the backing store now instead of waiting for GC.
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
