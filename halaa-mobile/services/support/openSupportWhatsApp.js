import { buildSupportRequest, SUPPORT_SOURCE } from "@halaa/shared/support";

let rn = null;
try {
  // eslint-disable-next-line global-require
  rn = require("react-native");
} catch (_err) {
  // In pure Node.js environments (like node:test runner), react-native flow syntax cannot be evaluated directly.
}

const defaultNativeLinking = rn?.Linking;
const defaultNativeAlert = rn?.Alert;

export { buildSupportRequest, SUPPORT_SOURCE };

/**
 * Creates a support launcher instance bound to linking and alert implementations.
 */
export function createSupportLauncher({
  linking = defaultNativeLinking,
  alert = defaultNativeAlert,
} = {}) {
  return async function openSupportWhatsApp({
    language = "ar",
    source = SUPPORT_SOURCE.GENERAL,
    reference = null,
    showAlertOnError = true,
    alertTitle = null,
    alertMessage = null,
    _linking = linking,
    _alert = alert,
  } = {}) {
    const { deepLinkUrl, webUrl, displayNumber } = buildSupportRequest({
      language,
      source,
      reference,
    });

    // 1. Try WhatsApp deep link
    try {
      const canDeepLink = _linking && (await _linking.canOpenURL(deepLinkUrl));
      if (canDeepLink) {
        await _linking.openURL(deepLinkUrl);
        return { opened: true, channel: "app" };
      }
    } catch (_err) {
      // Proceed to web fallback
    }

    // 2. Try web URL (wa.me)
    try {
      const canWeb = _linking && (await _linking.canOpenURL(webUrl));
      if (canWeb) {
        await _linking.openURL(webUrl);
        return { opened: true, channel: "web" };
      }
    } catch (_err) {
      // Proceed to failure handling
    }

    // 3. Fallback: Alert with direct contact number
    if (showAlertOnError && _alert) {
      const isAr = language !== "en";
      const title = alertTitle || (isAr ? "تواصل معنا" : "Contact Support");
      const message =
        alertMessage ||
        (isAr
          ? `تعذر فتح تطبيق واتساب. يمكنك التواصل معنا مباشرة عبر الرقم:\n${displayNumber}`
          : `Unable to open WhatsApp. You can reach us directly at:\n${displayNumber}`);

      _alert.alert(title, message);
    }

    return { opened: false, channel: "none" };
  };
}

export const openSupportWhatsApp = createSupportLauncher();
