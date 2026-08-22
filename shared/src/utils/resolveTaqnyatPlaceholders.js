/**
 * Resolve Taqnyat WhatsApp template `{{N}}` placeholders against an
 * event/guest/host context, so client previews match what the recipient
 * actually sees at send time.
 *
 * Two resolution modes:
 *   1. Per-template `varMapping[]` (admin-curated dotted source keys).
 *   2. Legacy 5-param fallback when `varMapping` is missing or empty:
 *      {{1}}=guest.name, {{2}}=eventDetails.title,
 *      {{3}}=eventDetails.dateFormatted, {{4}}=eventDetails.time,
 *      {{5}}=eventDetails.location.address.
 *
 * Date formatting is the caller's responsibility — pass an already-
 * formatted string in `context.eventDetails.dateFormatted` to keep
 * locale/calendar concerns out of this utility.
 *
 * @param {string} bodyText  Raw template body containing `{{N}}` slots.
 * @param {{ placeholder: string, sourceKey: string, fallback?: string }[]} varMapping
 * @param {object} context   Resolution context (guest/eventDetails/host/...).
 * @returns {string}         Body with placeholders replaced (or the original
 *                           text if `bodyText` is empty).
 */
export function resolveTaqnyatPlaceholders(bodyText, varMapping, context = {}) {
  if (!bodyText || typeof bodyText !== "string") return bodyText || "";

  const resolveBySourceKey = (sourceKey, fallback) => {
    if (!sourceKey) return fallback ?? "";
    const value = String(sourceKey)
      .split(".")
      .reduce((acc, key) => (acc == null ? acc : acc[key]), context);
    if (value === undefined || value === null || value === "") {
      return fallback ?? "";
    }
    return String(value);
  };

  const hasMapping = Array.isArray(varMapping) && varMapping.length > 0;

  // Build a lookup of placeholder → resolved value.
  const resolved = new Map();

  if (hasMapping) {
    for (const entry of varMapping) {
      if (!entry || !entry.placeholder) continue;
      resolved.set(
        entry.placeholder,
        resolveBySourceKey(entry.sourceKey, entry.fallback)
      );
    }
  } else {
    // Legacy fallback order (supports up to 7 placeholders).
    const legacyOrder = [
      "guest.name",
      "eventDetails.title",
      "eventDetails.dateFormatted",
      "eventDetails.time",
      "eventDetails.location.address",
      "eventDetails.time",
      "eventDetails.location.address",
    ];
    legacyOrder.forEach((sourceKey, index) => {
      resolved.set(`{{${index + 1}}}`, resolveBySourceKey(sourceKey, ""));
    });
  }

  // Replace every `{{N}}` occurrence. Unknown placeholders are left intact
  // so a misconfigured template stays visibly broken rather than silently
  // dropping content.
  return bodyText.replace(/\{\{\s*(\d+)\s*\}\}/g, (match, n) => {
    const key = `{{${n}}}`;
    return resolved.has(key) ? resolved.get(key) : match;
  });
}

/**
 * Build a resolution context from raw create-event form values. Keeps
 * client call sites short: pass form data + a pre-formatted date string
 * and you get the context shape the resolver expects.
 *
 * @param {object} params
 * @param {string} params.guestName       Sample guest name for preview.
 * @param {string} params.eventTitle      `eventName` from the form.
 * @param {string} params.dateFormatted   Already-formatted date string.
 * @param {string} params.eventTime       `eventTime` from the form.
 * @param {string} params.locationAddress `address.address` from the form.
 * @param {string} [params.hostName]      Logged-in host's display name.
 */
export function buildTaqnyatPreviewContext({
  guestName,
  eventTitle,
  dateFormatted,
  eventTime,
  locationAddress,
  hostName,
}) {
  return {
    guest: { name: guestName || "" },
    eventDetails: {
      title: eventTitle || "",
      dateFormatted: dateFormatted || "",
      time: eventTime || "",
      location: { address: locationAddress || "" },
    },
    host: { name: hostName || "" },
  };
}
