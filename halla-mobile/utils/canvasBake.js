/**
 * canvasBake — Phase 4c W2-MOBILE-WIZARD
 *
 * Bakes a React Native view (the visual-template canvas) into a PNG
 * file that can be uploaded as the WhatsApp header image.
 *
 * Mobile equivalent of the web `htmlToImageConvert` helper. Uses
 * `react-native-view-shot` (already installed at v4.0.3 — per
 * PHASE_4C_PLAN §0 row 9; the deps `html-to-image` + `html2canvas`
 * lingering in halla-mobile/package.json are dead and dropped in this
 * sub-track).
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

/**
 * Capture the referenced view as a PNG and return both the file URI
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

  const captureOptions = {
    format: "png",
    quality: options.quality ?? 0.95,
    result: "tmpfile",
  };
  if (options.width) captureOptions.width = options.width;
  if (options.height) captureOptions.height = options.height;

  const uri = await captureRef(viewRef, captureOptions);
  const filename = `template-${Date.now()}.png`;
  return {
    uri,
    file: {
      uri,
      name: filename,
      type: "image/png",
    },
  };
}

export default bakeCanvas;
