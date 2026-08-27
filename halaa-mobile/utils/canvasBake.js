/**
 * canvasBake
 *
 * Bakes a React Native view (the visual-template canvas) into a PNG
 * file that can be uploaded as the WhatsApp header image.
 *
 * Uses `react-native-view-shot`.
 *
 * Usage:
 *   const ref = useRef(null);
 *   <ViewShot ref={ref} options={{ format: 'png', quality: 0.95 }}>
 *     <TemplateCanvas ... />
 *   </ViewShot>
 *   const baked = await bakeCanvas(ref);
 *   // baked.uri  — file:// path
 *   // baked.file — { uri, name, type } shape ready for FormData
 */

import { captureRef } from "react-native-view-shot";
import { normalizeInvitationImage } from "./invitationImage";

/**
 * Capture the referenced view as a bounded JPEG and return both the file URI
 * and a multer-compatible file object.
 *
 * @param {React.RefObject} viewRef - Ref attached to a View / ViewShot
 * @param {object} [options]
 * @param {number} [options.width]   - Width hint passed to react-native-view-shot
 * @param {number} [options.height]
 * @param {number} [options.quality=0.95]
 * @returns {Promise<{uri: string, file: {uri: string, name: string, type: string}}>}
 */
export async function bakeCanvas(viewRef, options = {}) {
  if (!viewRef?.current) {
    throw new Error("bakeCanvas: viewRef is empty — make sure the canvas mounted before calling");
  }

  const naturalWidth = Number(options.width) || null;
  const naturalHeight = Number(options.height) || null;
  const maxDimension = 2048;
  const scale =
    naturalWidth && naturalHeight
      ? Math.min(1, maxDimension / Math.max(naturalWidth, naturalHeight))
      : 1;

  const captureOptions = {
    format: "jpg",
    quality: options.quality ?? 0.86,
    result: "tmpfile",
  };
  if (naturalWidth) captureOptions.width = Math.max(1, Math.round(naturalWidth * scale));
  if (naturalHeight) captureOptions.height = Math.max(1, Math.round(naturalHeight * scale));

  const uri = await captureRef(viewRef, captureOptions);
  const normalized = await normalizeInvitationImage({
    uri,
    width: captureOptions.width,
    height: captureOptions.height,
  });
  return {
    uri: normalized.uri,
    file: normalized,
  };
}

export default bakeCanvas;
