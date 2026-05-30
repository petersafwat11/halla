import { getMediaUrl as _getMediaUrlShared } from "@halla/shared/utils/media";

/**
 * Web wrapper around `@halla/shared/utils/media#getMediaUrl`. Reads the
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

/**
 * Bake a DOM ref into a PNG using `html2canvas`. We deliberately do NOT
 * set `allowTaint: true` — pairing it with `useCORS` produces a tainted
 * canvas when the source bucket lacks CORS, which then silently bakes a
 * partial image (text only, no background) and makes `canvas.toBlob`
 * return null. Strict CORS-only loading surfaces the underlying
 * S3/CDN misconfiguration as a clear error instead of shipping a broken
 * file downstream.
 */
export async function htmlToImageConvert(
  imageRef,
  fileName = "template-image",
  options = {}
) {
  const { autoDownload = false, returnBlob = false } = options;
  const html2canvas = (await import("html2canvas")).default;

  try {
    const canvas = await html2canvas(imageRef.current, {
      useCORS: true,
      backgroundColor: "#ffffff",
      scale: 2,
      logging: false,
      ignoreElements: (element) =>
        element.tagName === "SCRIPT" || element.tagName === "NOSCRIPT",
    });

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Failed to generate image blob"));
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result;

          if (autoDownload) {
            const link = document.createElement("a");
            link.download = `${fileName}.png`;
            link.href = dataUrl;
            link.click();
          }

          if (returnBlob) {
            resolve({
              dataUrl,
              blob,
              file: new File([blob], `${fileName}.png`, { type: "image/png" }),
            });
          } else {
            resolve(dataUrl);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }, "image/png");
    });
  } catch (err) {
    console.error("Error converting HTML to image:", err);
    throw err;
  }
}
