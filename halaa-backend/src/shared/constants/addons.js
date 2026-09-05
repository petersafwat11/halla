const ADDON_TYPES = {
  EXTRA_INVITES: 'extra_invites',
  DESIGN_TEMPLATE: 'design_template',
  BUSINESS_CUSTOMIZATION: 'business_customization',
};

// Standard flat rate: 4 SAR per extra invite. price === quantity * 4 for
// every tier. Keep this invariant when adding/editing tiers.
const EXTRA_INVITES_PRICE_PER_INVITE = 4;

const EXTRA_INVITES_TIERS = [
  10, 20, 30, 40, 50, 75, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500,
].map((quantity) => ({
  quantity,
  price: quantity * EXTRA_INVITES_PRICE_PER_INVITE,
}));

const DESIGN_TEMPLATE_TIERS = [
  { type: 'ready_made',    nameAr: 'تصميم دعوات جاهزة (رجالي/نسائي)', nameEn: 'Ready-made design (male/female)', price: 200 },
  { type: 'custom_male',   nameAr: 'تصميم دعوات رجالية مخصصة',        nameEn: 'Custom male design',              price: 200 },
  { type: 'custom_themed', nameAr: 'تصميم دعوات حسب ثيم المناسبة',    nameEn: 'Themed custom design',            price: 275 },
  { type: 'animated',      nameAr: 'تصميم دعوات بخلفيات متحركة',      nameEn: 'Animated background design',      price: 350 },
  { type: '3d',            nameAr: 'تصميم دعوات ثلاثية الأبعاد (3D)', nameEn: '3D invitation design',            price: 500 },
];

const BUSINESS_CUSTOMIZATION = {
  type: 'business_customization',
  nameAr: 'تخصيص هوية العلامة التجارية',
  nameEn: 'Business Branding Customization',
  price: 2500,
  descriptionAr: 'صفحة ويب مخصصة + 4 قوالب واتساب رسمية + تنفيذ خلال أسبوع',
  descriptionEn: 'Custom webpage + 4 official WhatsApp templates + delivered in 1 week',
};

/**
 * PR6 / F-12: Custom Design Managed-Service Fulfillment Lifecycle
 * Top-level Addon.status remains canonical.
 * Allowed sequence: paid -> queued -> in_progress -> fulfilled
 */
const DESIGN_FULFILLMENT_STATUS = Object.freeze({
  PAID: 'paid',
  QUEUED: 'queued',
  IN_PROGRESS: 'in_progress',
  FULFILLED: 'fulfilled',
});

const DESIGN_FULFILLMENT_SEQUENCE = Object.freeze([
  DESIGN_FULFILLMENT_STATUS.PAID,
  DESIGN_FULFILLMENT_STATUS.QUEUED,
  DESIGN_FULFILLMENT_STATUS.IN_PROGRESS,
  DESIGN_FULFILLMENT_STATUS.FULFILLED,
]);

const DESIGN_FULFILLMENT_TRANSITIONS = Object.freeze({
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

function isValidDesignFulfillmentTransition(fromStatus, toStatus) {
  if (!fromStatus || !toStatus) return false;
  if (fromStatus === toStatus) return true; // idempotent
  const allowed = DESIGN_FULFILLMENT_TRANSITIONS[fromStatus];
  return Array.isArray(allowed) && allowed.includes(toStatus);
}

function getNextFulfillmentStatus(currentStatus) {
  const allowed = DESIGN_FULFILLMENT_TRANSITIONS[currentStatus];
  if (Array.isArray(allowed) && allowed.length > 0) {
    return allowed[0];
  }
  return null;
}

const DESIGN_FULFILLMENT_SLA_HOURS = Object.freeze({
  ready_made: 48,
  custom_male: 72,
  custom_themed: 72,
  animated: 96,
  '3d': 120,
});

const DEFAULT_DESIGN_FULFILLMENT_SLA_HOURS = 72;

function deriveExpectedDeliveryDate(templateType, fromDate = new Date()) {
  const start = fromDate instanceof Date ? fromDate : new Date(fromDate);
  const baseTime = isNaN(start.getTime()) ? Date.now() : start.getTime();
  const hours = DESIGN_FULFILLMENT_SLA_HOURS[templateType] || DEFAULT_DESIGN_FULFILLMENT_SLA_HOURS;
  return new Date(baseTime + hours * 60 * 60 * 1000);
}

module.exports = {
  ADDON_TYPES,
  EXTRA_INVITES_TIERS,
  EXTRA_INVITES_PRICE_PER_INVITE,
  DESIGN_TEMPLATE_TIERS,
  BUSINESS_CUSTOMIZATION,
  DESIGN_FULFILLMENT_STATUS,
  DESIGN_FULFILLMENT_SEQUENCE,
  DESIGN_FULFILLMENT_TRANSITIONS,
  isValidDesignFulfillmentTransition,
  getNextFulfillmentStatus,
  DESIGN_FULFILLMENT_SLA_HOURS,
  DEFAULT_DESIGN_FULFILLMENT_SLA_HOURS,
  deriveExpectedDeliveryDate,
};
