/**
 * Canonical Addon Constants & Fulfillment State Machine (@halaa/shared)
 * Single source of truth for addon types, fulfillment workflow, and SLAs.
 */

export const ADDON_TYPES = Object.freeze({
  EXTRA_INVITES: "extra_invites",
  DESIGN_TEMPLATE: "design_template",
  BUSINESS_CUSTOMIZATION: "business_customization",
});

export const EXTRA_INVITES_PRICE_PER_INVITE = 4;

export const EXTRA_INVITES_TIERS = Object.freeze([
  10, 20, 30, 40, 50, 75, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500,
].map((quantity) => Object.freeze({
  quantity,
  price: quantity * EXTRA_INVITES_PRICE_PER_INVITE,
})));

export const DESIGN_TEMPLATE_TIERS = Object.freeze([
  Object.freeze({ type: "ready_made",    nameAr: "تصميم دعوات جاهزة (رجالي/نسائي)", nameEn: "Ready-made design (male/female)", price: 200 }),
  Object.freeze({ type: "custom_male",   nameAr: "تصميم دعوات رجالية مخصصة",        nameEn: "Custom male design",              price: 200 }),
  Object.freeze({ type: "custom_themed", nameAr: "تصميم دعوات حسب ثيم المناسبة",    nameEn: "Themed custom design",            price: 275 }),
  Object.freeze({ type: "animated",      nameAr: "تصميم دعوات بخلفيات متحركة",      nameEn: "Animated background design",      price: 350 }),
  Object.freeze({ type: "3d",            nameAr: "تصميم دعوات ثلاثية الأبعاد (3D)", nameEn: "3D invitation design",            price: 500 }),
]);

export const BUSINESS_CUSTOMIZATION = Object.freeze({
  type: "business_customization",
  nameAr: "تخصيص هوية العلامة التجارية",
  nameEn: "Business Branding Customization",
  price: 2500,
  descriptionAr: "صفحة ويب مخصصة + 4 قوالب واتساب رسمية + تنفيذ خلال أسبوع",
  descriptionEn: "Custom webpage + 4 official WhatsApp templates + delivered in 1 week",
});

/**
 * PR6 / F-12: Custom Design Managed-Service Fulfillment Lifecycle
 * Top-level Addon.status remains canonical.
 * Allowed sequence: paid -> queued -> in_progress -> fulfilled
 */
export const DESIGN_FULFILLMENT_STATUS = Object.freeze({
  PAID: "paid",
  QUEUED: "queued",
  IN_PROGRESS: "in_progress",
  FULFILLED: "fulfilled",
});

export const DESIGN_FULFILLMENT_SEQUENCE = Object.freeze([
  DESIGN_FULFILLMENT_STATUS.PAID,
  DESIGN_FULFILLMENT_STATUS.QUEUED,
  DESIGN_FULFILLMENT_STATUS.IN_PROGRESS,
  DESIGN_FULFILLMENT_STATUS.FULFILLED,
]);

export const DESIGN_FULFILLMENT_TRANSITIONS = Object.freeze({
  [DESIGN_FULFILLMENT_STATUS.PAID]: Object.freeze([
    DESIGN_FULFILLMENT_STATUS.QUEUED,
  ]),
  [DESIGN_FULFILLMENT_STATUS.QUEUED]: Object.freeze([
    DESIGN_FULFILLMENT_STATUS.IN_PROGRESS,
  ]),
  [DESIGN_FULFILLMENT_STATUS.IN_PROGRESS]: Object.freeze([
    DESIGN_FULFILLMENT_STATUS.FULFILLED,
  ]),
  [DESIGN_FULFILLMENT_STATUS.FULFILLED]: Object.freeze([]),
});

/**
 * Validates whether a fulfillment status transition is permitted.
 * Same-state transitions are considered idempotent (returns true).
 *
 * @param {string} fromStatus - Current Addon.status
 * @param {string} toStatus - Desired Addon.status
 * @returns {boolean}
 */
export function isValidDesignFulfillmentTransition(fromStatus, toStatus) {
  if (!fromStatus || !toStatus) return false;
  if (fromStatus === toStatus) return true; // idempotent
  const allowed = DESIGN_FULFILLMENT_TRANSITIONS[fromStatus];
  return Array.isArray(allowed) && allowed.includes(toStatus);
}

/**
 * Returns the single valid next fulfillment action/status for a given current status,
 * or null if none is available (e.g. fulfilled or non-fulfillment status).
 *
 * @param {string} currentStatus
 * @returns {string|null}
 */
export function getNextFulfillmentStatus(currentStatus) {
  const allowed = DESIGN_FULFILLMENT_TRANSITIONS[currentStatus];
  if (Array.isArray(allowed) && allowed.length > 0) {
    return allowed[0];
  }
  return null;
}

/**
 * Approved fulfillment SLA in hours by template tier.
 * Owner-approved SLA basis.
 */
export const DESIGN_FULFILLMENT_SLA_HOURS = Object.freeze({
  ready_made: 48,
  custom_male: 72,
  custom_themed: 72,
  animated: 96,
  "3d": 120,
});

export const DEFAULT_DESIGN_FULFILLMENT_SLA_HOURS = 72;

/**
 * Derives expected delivery Date from SLA.
 *
 * @param {string} [templateType]
 * @param {Date|string|number} [fromDate]
 * @returns {Date}
 */
export function deriveExpectedDeliveryDate(templateType, fromDate = new Date()) {
  const start = fromDate instanceof Date ? fromDate : new Date(fromDate);
  const baseTime = isNaN(start.getTime()) ? Date.now() : start.getTime();
  const hours = DESIGN_FULFILLMENT_SLA_HOURS[templateType] || DEFAULT_DESIGN_FULFILLMENT_SLA_HOURS;
  return new Date(baseTime + hours * 60 * 60 * 1000);
}
