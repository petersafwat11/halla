"use client";

import { htmlToImageConvert } from "@/utils/index";

/**
 * Drives the html-to-image bake step for template previews.
 * Pre-flights the background image under CORS so we don't ship a
 * text-only render when the bucket is missing Access-Control-Allow-Origin.
 */
export async function bakeTemplateImage(previewRef, { backgroundUrl } = {}) {
  if (!previewRef?.current) {
    throw new Error("Template preview element is not ready.");
  }

  if (backgroundUrl) {
    await new Promise((resolve, reject) => {
      const probe = new Image();
      probe.crossOrigin = "anonymous";
      probe.onload = () => resolve();
      probe.onerror = () =>
        reject(
          new Error(
            "Template background image could not be loaded under CORS. " +
              "The S3 bucket must allow GET requests from this origin."
          )
        );
      probe.src = backgroundUrl;
    });
  }

  const baked = await htmlToImageConvert(previewRef, "template-image", {
    autoDownload: false,
    returnBlob: true,
  });
  if (!baked?.file) {
    throw new Error("Failed to bake template image");
  }
  return baked.file;
}
