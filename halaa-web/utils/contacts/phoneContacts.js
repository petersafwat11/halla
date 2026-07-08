/**
 * Web phone-contact import via the Contact Picker API.
 *
 * IMPORTANT: the Contact Picker API (`navigator.contacts.select`) is
 * Android-Chrome / Chromium-mobile ONLY. There is no cross-browser way to
 * read the device address book on the web (desktop, Safari, Firefox, and
 * iOS have no contacts API). Callers must feature-detect with
 * `isContactPickerSupported()` and only surface the entry point when true;
 * everywhere else, Excel import + the "Add from your guests" book are the
 * cross-browser contact-import paths.
 *
 * The full native phonebook import lives in the mobile app (expo-contacts).
 */

/**
 * True only where the browser can actually read contacts (Android Chrome).
 */
export const isContactPickerSupported = () =>
  typeof navigator !== "undefined" &&
  !!navigator.contacts &&
  typeof navigator.contacts.select === "function" &&
  typeof window !== "undefined" &&
  window.isSecureContext;

/**
 * Normalize an arbitrary phone string to the app's canonical Saudi mobile
 * form (`5xxxxxxxx`, 9 digits). Returns null when it isn't a Saudi mobile.
 * Mirrors the backend canonical format and the step-2 `^5[0-9]{8}$` rule.
 */
export const normalizeSaudiMobile = (raw) => {
  if (!raw) return null;
  let d = String(raw).replace(/[^\d+]/g, "");
  d = d.replace(/^\+/, "");
  if (d.startsWith("00966")) d = d.slice(5);
  else if (d.startsWith("966")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  return /^5\d{8}$/.test(d) ? d : null;
};

/**
 * Open the OS contact picker and return the user-selected contacts mapped to
 * `{ name, mobile }`. Only contacts with a valid Saudi mobile are returned
 * (first valid number wins when a contact has several). The browser only
 * ever returns the entries the user explicitly picks — never the full
 * phonebook.
 *
 * @returns {Promise<Array<{ name: string, mobile: string }>>}
 * @throws {Error} 'contact_picker_unsupported' when the API is unavailable
 */
export const pickPhoneContacts = async () => {
  if (!isContactPickerSupported()) {
    throw new Error("contact_picker_unsupported");
  }

  const selected = await navigator.contacts.select(["name", "tel"], {
    multiple: true,
  });

  return (selected || [])
    .map((c) => {
      const name = (Array.isArray(c.name) ? c.name[0] : c.name) || "";
      const tels = Array.isArray(c.tel) ? c.tel : c.tel ? [c.tel] : [];
      let mobile = null;
      for (const tel of tels) {
        const norm = normalizeSaudiMobile(tel);
        if (norm) {
          mobile = norm;
          break;
        }
      }
      return { name: name.trim(), mobile };
    })
    .filter((c) => c.name && c.mobile);
};
