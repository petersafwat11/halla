"use client";

import { htmlToImageConvert } from "@/utils/index";
import { normalizeInvitationImageFile } from "@/utils/invitationImage";

/**
 * Drives the html-to-image bake step for template previews.
 *
 * S3/CloudFront buckets serving template artwork may not return CORS
 * headers, which taints the canvas and makes `canvas.toBlob` return
 * null. To avoid that, we route every cross-origin image inside the
 * preview through `/api/proxy/image` (same-origin) just for the bake,
 * then restore the original `src` afterwards so the on-screen preview
 * keeps using the canonical URL.
 */
const PROXY_PATH = "/api/proxy/image";

const isAbsoluteUrl = (src) => /^https?:\/\//i.test(src);

const isSameOrigin = (src) => {
  try {
    return new URL(src, window.location.origin).origin === window.location.origin;
  } catch {
    return false;
  }
};

const proxify = (src) =>
  `${PROXY_PATH}?url=${encodeURIComponent(src)}`;

const waitForLoad = (img) =>
  new Promise((resolve, reject) => {
    if (img.complete && img.naturalWidth > 0) return resolve();
    const onLoad = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("image-load-failed"));
    };
    const cleanup = () => {
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
    };
    img.addEventListener("load", onLoad);
    img.addEventListener("error", onError);
  });

async function swapToProxy(rootEl) {
  const imgs = Array.from(rootEl.querySelectorAll("img"));
  const restorers = [];
  try {
    await Promise.all(
      imgs.map(async (img) => {
      const original = img.getAttribute("src");
      const originalCO = img.getAttribute("crossorigin");
      if (!original || !isAbsoluteUrl(original) || isSameOrigin(original)) {
        return;
      }
      img.removeAttribute("crossorigin");
      img.setAttribute("src", proxify(original));
      restorers.push(() => {
        if (originalCO !== null) img.setAttribute("crossorigin", originalCO);
        img.setAttribute("src", original);
      });
      await waitForLoad(img);
      })
    );
  } catch (error) {
    restorers.forEach((restore) => restore());
    throw error;
  }
  return () => restorers.forEach((r) => r());
}

export async function bakeTemplateImage(previewRef, _options = {}) {
  if (!previewRef?.current) {
    throw new Error("Template preview element is not ready.");
  }

  const restore = await swapToProxy(previewRef.current);
  try {
    // A white canvas with text overlays is not a valid invitation image.
    // Refuse to bake until every background/decoration image has decoded.
    await Promise.all(
      Array.from(previewRef.current.querySelectorAll("img")).map(waitForLoad)
    );
    const baked = await htmlToImageConvert(previewRef, "template-image", {
      autoDownload: false,
      returnBlob: true,
    });
    if (!baked?.file) {
      throw new Error("Failed to bake template image");
    }
    return normalizeInvitationImageFile(baked.file);
  } finally {
    restore();
  }
}
