/**
 * canvasBake
 *
 * Bakes a React Native view (the visual-template canvas) into a bounded JPEG
 * file that can be uploaded as the WhatsApp header image.
 *
 * Uses `react-native-view-shot`.
 *
 * Usage:
 *   const ref = useRef(null);
 *   <View ref={ref} collapsable={false}>
 *     <TemplatePreviewCanvas ... />
 *   </View>
 *   const baked = await bakeCanvas(ref, { width, height, onPhase });
 *   // baked.uri  — file:// path
 *   // baked.file — { uri, name, type } shape ready for FormData
 */

import { InteractionManager, Platform } from "react-native";
import { captureRef } from "react-native-view-shot";
import {
  boundInvitationDimensions,
  tagTemplateBakeError,
  TEMPLATE_BAKE_ERROR,
} from "@halaa/shared/utils/invitationImagePlan";
import { normalizeInvitationImage } from "./invitationImage";

/**
 * Resolve once pending interactions (modal/keyboard animations) settle and two
 * frames have drawn, so the busy state and placeholder-free canvas are on
 * screen before the capture reads pixels.
 */
const afterInteractionsAndFrame = () =>
  new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  });

const canvasToJpegBlob = (canvas, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("TEMPLATE_JPEG_ENCODING_FAILED"))),
      "image/jpeg",
      quality,
    );
  });

async function captureWebCanvas(viewRef, bounded, options) {
  const node = viewRef.current;
  if (!node?.getBoundingClientRect) {
    throw new Error("TEMPLATE_WEB_CANVAS_NOT_MOUNTED");
  }

  // react-native-view-shot deliberately does not implement captureRef on web.
  // Clone the already-rendered RN Web node instead, including authenticated
  // template assets, and encode directly to a binary Blob (never a data URL).
  const { toCanvas } = await import("html-to-image");
  const rect = node.getBoundingClientRect();
  const sourceWidth = Math.max(1, Math.round(rect.width));
  const sourceHeight = Math.max(1, Math.round(rect.height));
  const canvas = await toCanvas(node, {
    backgroundColor: "#ffffff",
    width: sourceWidth,
    height: sourceHeight,
    canvasWidth: bounded?.width || sourceWidth,
    canvasHeight: bounded?.height || sourceHeight,
    pixelRatio: 1,
    cacheBust: false,
    includeQueryParams: true,
    skipFonts: true,
    fetchRequestInit: options.authToken
      ? { headers: { Authorization: `Bearer ${options.authToken}` } }
      : undefined,
  });
  const blob = await canvasToJpegBlob(canvas, options.quality ?? 0.9);
  const uri = URL.createObjectURL(blob);
  const file = {
    uri,
    name: "template-image.jpg",
    type: "image/jpeg",
    size: blob.size,
    width: canvas.width,
    height: canvas.height,
    ownedObjectUrl: true,
  };
  return { uri, file };
}

/**
 * Capture the referenced view straight to a bounded JPEG temp file and return
 * both the file URI and a multer-compatible file object.
 *
 * @param {React.RefObject} viewRef - Ref attached to the canvas View
 * @param {object} [options]
 * @param {number} [options.width]   - Template natural width
 * @param {number} [options.height]  - Template natural height
 * @param {number} [options.quality=0.9]
 * @param {(phase: "preparing"|"generating"|"optimizing") => void} [options.onPhase]
 * @returns {Promise<{uri: string, file: {uri: string, name: string, type: string}}>}
 */
export async function bakeCanvas(viewRef, options = {}) {
  if (!viewRef?.current) {
    throw tagTemplateBakeError(
      new Error("bakeCanvas: viewRef is empty — make sure the canvas mounted before calling"),
      TEMPLATE_BAKE_ERROR.CAPTURE
    );
  }

  const { onPhase } = options;
  onPhase?.("preparing");
  await afterInteractionsAndFrame();

  // Capturing at the bounded output size lets a fitting JPEG skip re-encoding.
  const bounded = boundInvitationDimensions({ width: options.width, height: options.height });
  if (Platform.OS === "web") {
    onPhase?.("generating");
    try {
      const baked = await captureWebCanvas(viewRef, bounded, options);
      onPhase?.("optimizing");
      return baked;
    } catch (error) {
      throw tagTemplateBakeError(error, TEMPLATE_BAKE_ERROR.CAPTURE);
    }
  }

  const captureOptions = {
    format: "jpg",
    quality: options.quality ?? 0.9,
    result: "tmpfile",
  };
  if (bounded) {
    captureOptions.width = bounded.width;
    captureOptions.height = bounded.height;
  }

  onPhase?.("generating");
  let uri;
  try {
    uri = await captureRef(viewRef, captureOptions);
  } catch (error) {
    throw tagTemplateBakeError(error, TEMPLATE_BAKE_ERROR.CAPTURE);
  }

  onPhase?.("optimizing");
  const normalized = await normalizeInvitationImage({
    uri,
    width: captureOptions.width,
    height: captureOptions.height,
    type: "image/jpeg",
    skipIfBounded: true,
    ownsSource: true,
  });
  return {
    uri: normalized.uri,
    file: normalized,
  };
}

export default bakeCanvas;
