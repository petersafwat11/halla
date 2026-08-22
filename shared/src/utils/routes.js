/**
 * Route builders and parsers for events
 * Resolves EVT-11 and unifies update-event URL generation across web and mobile.
 */

export const EVENT_UPDATE_SECTION_TO_STEP = Object.freeze({
  "event-details": 1,
  "details": 1,
  "1": 1,
  "guest-list": 2,
  "guests": 2,
  "2": 2,
  "invitation-design": 3,
  "design": 3,
  "template": 3,
  "3": 3,
  "invitation-settings": 4,
  "invitation-customization": 4,
  "customization": 4,
  "settings": 4,
  "4": 4,
});

/**
 * Parses query params (URLSearchParams or plain object) into a canonical step number (1..4).
 * @param {URLSearchParams|Object} params
 * @returns {number} 1 | 2 | 3 | 4
 */
export const parseUpdateEventStep = (params) => {
  if (!params) return 1;
  const rawStep = typeof params.get === "function" ? params.get("step") : params.step;
  const rawSection = typeof params.get === "function" ? params.get("section") : params.section;

  if (rawStep !== undefined && rawStep !== null && rawStep !== "") {
    const parsed = parseInt(rawStep, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 4) {
      return parsed;
    }
  }

  if (rawSection) {
    const s = String(rawSection).toLowerCase().trim();
    if (EVENT_UPDATE_SECTION_TO_STEP[s]) {
      return EVENT_UPDATE_SECTION_TO_STEP[s];
    }
  }

  return 1;
};

/**
 * Builds canonical update event URL.
 * @param {Object} options
 * @param {string} [options.locale="ar"]
 * @param {string} [options.basePath="host"] "host" | "admin-dash" | "admin-dash/events"
 * @param {string} options.eventId
 * @param {number} [options.step=1]
 * @param {string} [options.section]
 * @returns {string}
 */
export const buildUpdateEventUrl = ({
  locale = "ar",
  basePath = "host",
  eventId,
  step = 1,
  section,
}) => {
  const normalizedStep = section
    ? (EVENT_UPDATE_SECTION_TO_STEP[section] || step)
    : step;
  const cleanBase = basePath.startsWith("/") ? basePath.slice(1) : basePath;
  const sectionPath = cleanBase.includes("admin")
    ? "admin-dash/update-event"
    : "host/update-event";
  const prefix = locale ? `/${locale}` : "";
  return `${prefix}/${sectionPath}?id=${eventId}&step=${normalizedStep}`;
};

/**
 * Builds canonical settings URL based on user role and locale.
 * @param {Object} options
 * @param {string} [options.role="host"]
 * @param {string} [options.locale="ar"]
 * @returns {string}
 */
export const buildSettingsUrl = ({ role = "host", locale = "ar" } = {}) => {
  const prefix = locale ? `/${locale}` : "";
  if (role === "admin" || role === "super_admin" || role === "moderator") {
    return `${prefix}/admin-dash/settings`;
  }
  if (role === "vendor") {
    return `${prefix}/vendor-dashboard/settings`;
  }
  return `${prefix}/host/settings`;
};

/**
 * Builds canonical dashboard URL based on user role and locale.
 * @param {Object} options
 * @param {string} [options.role="host"]
 * @param {string} [options.locale="ar"]
 * @returns {string}
 */
export const buildDashboardUrl = ({ role = "host", locale = "ar" } = {}) => {
  const prefix = locale ? `/${locale}` : "";
  if (role === "admin" || role === "super_admin" || role === "moderator") {
    return `${prefix}/admin-dash`;
  }
  if (role === "vendor") {
    return `${prefix}/vendor-dashboard`;
  }
  return `${prefix}/host`;
};

/**
 * Builds canonical events URL based on user role and locale.
 * @param {Object} options
 * @param {string} [options.role="host"]
 * @param {string} [options.locale="ar"]
 * @returns {string}
 */
export const buildEventsUrl = ({ role = "host", locale = "ar" } = {}) => {
  const prefix = locale ? `/${locale}` : "";
  if (role === "admin" || role === "super_admin" || role === "moderator") {
    return `${prefix}/admin-dash/events`;
  }
  return `${prefix}/host/events`;
};

/**
 * Builds canonical marketplace URL.
 * @param {Object} options
 * @param {string} [options.locale="ar"]
 * @returns {string}
 */
export const buildMarketplaceUrl = ({ locale = "ar" } = {}) => {
  const prefix = locale ? `/${locale}` : "";
  return `${prefix}/market-place`;
};

/**
 * Builds canonical marketplace vendor profile URL.
 * @param {Object} options
 * @param {string} options.vendorId
 * @param {string} [options.locale="ar"]
 * @returns {string}
 */
export const buildMarketplaceVendorUrl = ({ vendorId, locale = "ar" } = {}) => {
  const prefix = locale ? `/${locale}` : "";
  return `${prefix}/market-place/vendors/${vendorId}`;
};

