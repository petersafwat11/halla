import { buildSupportRequest, SUPPORT_SOURCE } from "@halaa/shared/support";

export { buildSupportRequest, SUPPORT_SOURCE };

/**
 * Web support launcher via WhatsApp.
 * Opens the canonical web link (https://wa.me) in a new tab with noopener,noreferrer.
 * Returns { opened: boolean, webUrl, displayNumber, text }
 *
 * @param {Object} options
 * @param {"ar"|"en"} [options.language="ar"]
 * @param {string} [options.source=SUPPORT_SOURCE.GENERAL]
 * @param {{ kind: "event"|"addon"|"request", value: string }|null} [options.reference=null]
 * @param {Function} [options.onFailure] - Callback if window.open fails
 * @returns {{ opened: boolean, webUrl: string, displayNumber: string, text: string }}
 */
export function openSupportWhatsAppWeb({
  language = "ar",
  source = SUPPORT_SOURCE.GENERAL,
  reference = null,
  onFailure = null,
} = {}) {
  const { webUrl, displayNumber, text } = buildSupportRequest({
    language,
    source,
    reference,
  });

  try {
    if (typeof window !== "undefined" && typeof window.open === "function") {
      const win = window.open(webUrl, "_blank", "noopener,noreferrer");
      if (win) {
        return { opened: true, webUrl, displayNumber, text };
      }
    }
  } catch (err) {
    if (typeof onFailure === "function") {
      onFailure(err, { webUrl, displayNumber, text });
    }
    return { opened: false, webUrl, displayNumber, text };
  }

  if (typeof onFailure === "function") {
    onFailure(new Error("Unable to open window"), { webUrl, displayNumber, text });
  }
  return { opened: false, webUrl, displayNumber, text };
}
