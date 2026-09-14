"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { htmlToImageConvert } from "@/utils/index";
import { normalizeInvitationImageFile } from "@/utils/invitationImage";
import {
  computeTemplateCaptureScale,
  tagTemplateBakeError,
  TEMPLATE_BAKE_ERROR,
} from "@halaa/shared/utils/invitationImagePlan";

/**
 * Template bake pipeline for Step 3.
 *
 * Template artwork served from the backend origin may lack CORS
 * headers, which taints the canvas and makes `canvas.toBlob` return null.
 * Such artwork is fetched once through the same-origin `/api/proxy/image`
 * route and cached as a blob URL that both the preview and the capture use,
 * so Save never swaps or re-downloads the visible image.
 */
const PROXY_PATH = "/api/proxy/image";
const MAX_CACHED_BACKGROUNDS = 24;
const CAPTURE_QUALITY = 0.9;

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

const needsProxy = (src) =>
  typeof window !== "undefined" && !!src && isAbsoluteUrl(src) && !isSameOrigin(src);

export const waitForTemplateImage = (img) =>
  new Promise((resolve, reject) => {
    if (img.complete) {
      if (img.naturalWidth > 0) return resolve();
      return reject(new Error("image-load-failed"));
    }
    const onLoad = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("image-load-failed"));
    };
    const cleanup = () => {
      clearTimeout(timer);
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
    };
    const timer = setTimeout(onError, 15000);
    img.addEventListener("load", onLoad);
    img.addEventListener("error", onError);
  });

/** Resolve after the browser has painted the current state (busy labels). */
export const nextPaint = () =>
  new Promise((resolve) => {
    if (typeof requestAnimationFrame !== "function") {
      setTimeout(resolve, 0);
      return;
    }
    requestAnimationFrame(() => setTimeout(resolve, 0));
  });

const backgroundCache = new Map();

/** Same-origin URL for template artwork, proxied and cached once per source. */
export function resolveBakeSafeImageUrl(src, { fetchImpl } = {}) {
  if (!needsProxy(src)) return Promise.resolve(src);
  const cached = backgroundCache.get(src);
  if (cached) return cached;

  const request = (fetchImpl || fetch)(proxify(src), { credentials: "same-origin" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`${TEMPLATE_BAKE_ERROR.BACKGROUND}:${response.status}`);
      }
      return response.blob();
    })
    .then((blob) => URL.createObjectURL(blob))
    .catch((error) => {
      backgroundCache.delete(src);
      throw tagTemplateBakeError(error, TEMPLATE_BAKE_ERROR.BACKGROUND);
    });

  backgroundCache.set(src, request);
  if (backgroundCache.size > MAX_CACHED_BACKGROUNDS) {
    const [oldestSrc, oldest] = backgroundCache.entries().next().value;
    backgroundCache.delete(oldestSrc);
    oldest.then((url) => URL.revokeObjectURL(url)).catch(() => {});
  }
  return request;
}

/**
 * Template whose background is safe to capture. Cross-origin artwork resolves
 * once when the editor opens; `pending` keeps Save disabled until it has.
 */
export function useBakeSafeTemplate(template) {
  const src =
    template?.previewImageUrl || template?.imageUrl || template?.thumbnailUrl || "";
  const proxied = needsProxy(src);
  const [resolved, setResolved] = useState({ src: null, url: null, error: null });
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    backgroundCache.delete(src);
    setResolved({ src: null, url: null, error: null });
    setAttempt((value) => value + 1);
  }, [src]);

  useEffect(() => {
    if (!needsProxy(src)) return undefined;
    let active = true;
    resolveBakeSafeImageUrl(src).then(
      (url) => {
        if (active) setResolved({ src, url, error: null });
      },
      (error) => {
        if (active) setResolved({ src, url: null, error });
      }
    );
    return () => {
      active = false;
    };
  }, [src, attempt]);

  const current = resolved.src === src ? resolved : null;
  const url = current?.url || null;
  const error = proxied ? current?.error || null : null;
  const previewTemplate = useMemo(
    () => (proxied && url ? { ...template, previewImageUrl: url } : template),
    [template, proxied, url]
  );

  return {
    template: previewTemplate,
    pending: proxied && !url && !error,
    error,
    retry,
  };
}

/**
 * Capture the live preview as a bounded JPEG File.
 *
 * Phases: `preparing` (images, fonts, a painted frame) → `generating`
 * (html2canvas on the preview only, at the template's bounded natural size)
 * → `optimizing` (skipped re-encode when the JPEG already fits). Each phase
 * yields a frame first so its busy state paints before the heavy work.
 */
export async function bakeTemplateImage(previewRef, options = {}) {
  const { naturalWidth, naturalHeight, onPhase, renderer } = options;
  const root = previewRef?.current;
  if (!root) {
    throw tagTemplateBakeError(
      new Error("Template preview element is not ready."),
      TEMPLATE_BAKE_ERROR.CAPTURE
    );
  }

  onPhase?.("preparing");
  await nextPaint();

  const images = Array.from(root.querySelectorAll("img"));
  if (images.some((img) => needsProxy(img.getAttribute("src")))) {
    throw tagTemplateBakeError(
      new Error("TEMPLATE_BACKGROUND_NOT_READY"),
      TEMPLATE_BAKE_ERROR.BACKGROUND
    );
  }
  // A white canvas with text overlays is not a valid invitation image.
  // Refuse to bake until every background/decoration image has decoded.
  try {
    await Promise.all(images.map(waitForTemplateImage));
  } catch (error) {
    throw tagTemplateBakeError(error, TEMPLATE_BAKE_ERROR.BACKGROUND);
  }
  if (document.fonts?.ready) await document.fonts.ready;

  onPhase?.("generating");
  await nextPaint();

  // Measure the layout size after the last busy-state paint. The clone is
  // pinned to this size, so the output lands exactly on the dimension cap.
  const rect = root.getBoundingClientRect();
  const width = root.offsetWidth || rect.width;
  const height = root.offsetHeight || rect.height;
  const scale = computeTemplateCaptureScale({
    renderedWidth: width,
    renderedHeight: height,
    naturalWidth,
    naturalHeight,
  });
  if (!scale) {
    throw tagTemplateBakeError(
      new Error("Template preview has no rendered size."),
      TEMPLATE_BAKE_ERROR.CAPTURE
    );
  }

  let baked;
  try {
    baked = await htmlToImageConvert(previewRef, "template-image", {
      returnBlob: true,
      scale,
      type: "image/jpeg",
      quality: CAPTURE_QUALITY,
      captureOnly: true,
      pinSize: { width, height },
      renderer,
    });
  } catch (error) {
    throw tagTemplateBakeError(
      error,
      /ENCODE/.test(error?.message || "") ? TEMPLATE_BAKE_ERROR.ENCODE : TEMPLATE_BAKE_ERROR.CAPTURE
    );
  }

  onPhase?.("optimizing");
  await nextPaint();
  return normalizeInvitationImageFile(baked.file, {
    width: baked.width,
    height: baked.height,
  });
}
