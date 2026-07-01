const { PLAN_CODES, PLAN_TYPES, PLAN_AVAILABILITY } = require('./plans');

// =============================================================================
// FEATURE BULLETS — authored per §4 of docs/plans-rewrite-2026-05.md.
// These strings are persisted on each Plan document under `featureBullets`
// and rendered verbatim by <PlanDescription>. Editing here re-seeds them
// into the DB the next time `node scripts/seedPlans.js` runs.
// =============================================================================

// Source: باقات هلا_FINAL.docx. The duration line, 15% compensation line, and
// the "1,200 ريال رسوم التأسيس" line from the doc are intentionally NOT
// bullets here — <PlanDescription> renders them as dedicated rows
// (durationLine, compensationRow, setupFeeRow).

// ──── Basic event (7 bullets) ────
const BASIC_EVENT_BULLETS_AR = [
  'إنشاء وإدارة مناسبة واحدة بواسطة العميل',
  'إدخال بيانات المدعوين يدويًا أو عبر رفع ملف',
  'لوحة تحكم وإحصائيات فورية',
  'إمكانية تعيين داعي إضافي للمناسبة',
  'الاختيار من مكتبة تصاميم جاهزة متنوعة',
  'إرسال تذكير تلقائي قبل المناسبة مع جدولة توقيت الإرسال',
  'استقبال رسائل مباركة بعد إنتهاء المناسبة',
];

const BASIC_EVENT_BULLETS_EN = [
  'Create and manage one event by yourself',
  'Add guest data manually or via file upload',
  'Real-time dashboard and statistics',
  'Assign an additional inviter to the event',
  'Choose from a diverse library of ready-made designs',
  'Automatic reminders before the event with customizable send-time scheduling',
  'Receive congratulatory messages after the event ends',
];

// ──── Basic monthly (7 bullets — bullet #1 swapped, #2-#7 identical to event) ────
const BASIC_MONTHLY_BULLETS_AR = [
  'إنشاء وإدارة عدد لا محدود من المناسبات بواسطة العميل',
  ...BASIC_EVENT_BULLETS_AR.slice(1),
];

const BASIC_MONTHLY_BULLETS_EN = [
  'Create and manage an unlimited number of events by yourself',
  ...BASIC_EVENT_BULLETS_EN.slice(1),
];

// ──── Premium event (5 bullets — rendered after the "All Basic features +" heading) ────
const PREMIUM_EVENT_BULLETS_AR = [
  'إدارة كاملة للمناسبة من قبل فريق دعم منصة هلا',
  'إدخال وتنظيم بيانات المدعوين نيابةً عن العميل',
  'ضبط التذكيرات والردود وتقارير الحضور',
  'متابعة مباشرة لحالة الدعوات والتأكد من وصولها',
  'دعم مخصص قبل وأثناء المناسبة',
];

const PREMIUM_EVENT_BULLETS_EN = [
  'Full event management by the Halaa platform support team',
  'Guest data entry and organization on your behalf',
  'Reminder, response, and attendance reporting setup',
  'Direct tracking of invitation delivery status',
  'Dedicated support before and during the event',
];

// ──── Premium monthly (5 bullets — bullet #1 caps at 3 events) ────
const PREMIUM_MONTHLY_BULLETS_AR = [
  'إدارة كاملة لعدد 3 مناسبات كحد أقصى من قبل فريق دعم منصة هلا',
  ...PREMIUM_EVENT_BULLETS_AR.slice(1),
];

const PREMIUM_MONTHLY_BULLETS_EN = [
  'Full management of up to 3 events by the Halaa platform support team',
  ...PREMIUM_EVENT_BULLETS_EN.slice(1),
];

// ──── Business base (6 bullets — shared across event/quarterly/annual under "تشمل:") ────
const BUSINESS_BASE_BULLETS_AR = [
  'إدارة كاملة لحساب المنشأة من قبل فريق دعم منصة هلا',
  'جميع مميزات باقة بريميوم',
  'خدمة عملاء مميزة ودعم فني مباشر',
  'تخصيص صفحة ويب خاصة للدعوة بألوان وهوية الجهة مع إضافة الشعار الرسمي',
  'تصميم الدعوات بما يتوافق مع ثيم المناسبة وهوية الجهة',
  'تخصيص قوالب رسائل واتساب',
];

const BUSINESS_BASE_BULLETS_EN = [
  'Full account management by the Halaa platform support team',
  'All features of the Premium plan included',
  'Premium customer service and direct technical support',
  "Custom-branded invitation web page with the organization's colors, identity, and official logo",
  'Invitation designs aligned with the event theme and organization identity',
  'Custom WhatsApp message templates',
];

// ──── Business per-variant extras (appended to the base list) ────
const BUSINESS_EVENT_EXTRAS_AR = [
  'إنشاء وتخصيص قالب واحد لرسالة واتساب للمناسبة',
  'تصميم دعوة لمناسبة العميل أو الإختيار من التصاميم الجاهزة',
];

const BUSINESS_EVENT_EXTRAS_EN = [
  'Create and customize one WhatsApp message template for the event',
  'Custom invitation design for your event or choose from ready-made designs',
];

const BUSINESS_QUARTERLY_EXTRAS_AR = [
  'عدد 500 دعوة مجانية خلال مدة الإشتراك',
  'إنشاء وتخصيص 3 قوالب لرسائل الواتساب',
  'تصميم عدد 3 دعوات لمناسبات العميل أو الإختيار من التصاميم الجاهزة',
];

const BUSINESS_QUARTERLY_EXTRAS_EN = [
  '500 free invitations during the subscription period',
  'Create and customize 3 WhatsApp message templates',
  'Custom design for 3 event invitations or choose from ready-made designs',
];

const BUSINESS_ANNUAL_EXTRAS_AR = [
  'عدد 2000 دعوة مجانية خلال مدة الإشتراك',
  'إنشاء وتخصيص 10 قوالب لرسائل الواتساب',
  'تصميم عدد 10 دعوات لمناسبات العميل أو الإختيار من التصاميم الجاهزة',
];

const BUSINESS_ANNUAL_EXTRAS_EN = [
  '2,000 free invitations during the subscription period',
  'Create and customize 10 WhatsApp message templates',
  'Custom design for 10 event invitations or choose from ready-made designs',
];

const BUSINESS_EVENT_BULLETS_AR = [...BUSINESS_BASE_BULLETS_AR, ...BUSINESS_EVENT_EXTRAS_AR];
const BUSINESS_EVENT_BULLETS_EN = [...BUSINESS_BASE_BULLETS_EN, ...BUSINESS_EVENT_EXTRAS_EN];
const BUSINESS_QUARTERLY_BULLETS_AR = [...BUSINESS_BASE_BULLETS_AR, ...BUSINESS_QUARTERLY_EXTRAS_AR];
const BUSINESS_QUARTERLY_BULLETS_EN = [...BUSINESS_BASE_BULLETS_EN, ...BUSINESS_QUARTERLY_EXTRAS_EN];
const BUSINESS_ANNUAL_BULLETS_AR = [...BUSINESS_BASE_BULLETS_AR, ...BUSINESS_ANNUAL_EXTRAS_AR];
const BUSINESS_ANNUAL_BULLETS_EN = [...BUSINESS_BASE_BULLETS_EN, ...BUSINESS_ANNUAL_EXTRAS_EN];

// =============================================================================
// FACTORIES
// =============================================================================

const basicEventPlan = (invites, price) => ({
  nameAr: `هلا بيسك ${invites} دعوة`,
  nameEn: `Halaa Basic ${invites} Invites`,
  planType: PLAN_TYPES.BASIC_EVENT,
  planFamily: 'basic',
  billingType: 'event',
  availableFor: PLAN_AVAILABILITY.HOST,
  pricing: { oneTime: price },
  currency: 'SAR',
  limits: { maxEvents: 1, maxInvitesPerEvent: invites, invitePool: invites, durationDays: 90 },
  features: { whatsAppTemplates: 0 },
  setupFeeAmount: 0,
  featureBullets: { ar: BASIC_EVENT_BULLETS_AR, en: BASIC_EVENT_BULLETS_EN },
  sortOrder: invites,
});

const basicMonthlyPlan = (pool, price) => ({
  nameAr: `هلا بيسك شهري ${pool} دعوة`,
  nameEn: `Halaa Basic Monthly ${pool} Invites`,
  planType: PLAN_TYPES.BASIC_MONTHLY,
  planFamily: 'basic',
  billingType: 'monthly',
  availableFor: PLAN_AVAILABILITY.HOST,
  pricing: { oneTime: price },
  currency: 'SAR',
  limits: { maxEvents: -1, maxInvitesPerEvent: null, invitePool: pool, durationDays: 30 },
  features: { whatsAppTemplates: 0 },
  setupFeeAmount: 0,
  featureBullets: { ar: BASIC_MONTHLY_BULLETS_AR, en: BASIC_MONTHLY_BULLETS_EN },
  sortOrder: pool,
});

const premiumEventPlan = (invites, price) => ({
  nameAr: `هلا بريميوم ${invites} دعوة`,
  nameEn: `Halaa Premium ${invites} Invites`,
  planType: PLAN_TYPES.PREMIUM_EVENT,
  planFamily: 'premium',
  billingType: 'event',
  availableFor: PLAN_AVAILABILITY.HOST,
  pricing: { oneTime: price },
  currency: 'SAR',
  limits: { maxEvents: 1, maxInvitesPerEvent: invites, invitePool: invites, durationDays: 90 },
  features: { whatsAppTemplates: 0 },
  setupFeeAmount: 0,
  featureBullets: { ar: PREMIUM_EVENT_BULLETS_AR, en: PREMIUM_EVENT_BULLETS_EN },
  sortOrder: invites,
});

const premiumMonthlyPlan = (pool, price) => ({
  nameAr: `هلا بريميوم شهري ${pool} دعوة`,
  nameEn: `Halaa Premium Monthly ${pool} Invites`,
  planType: PLAN_TYPES.PREMIUM_MONTHLY,
  planFamily: 'premium',
  billingType: 'monthly',
  availableFor: PLAN_AVAILABILITY.HOST,
  pricing: { oneTime: price },
  currency: 'SAR',
  limits: { maxEvents: -1, maxInvitesPerEvent: null, invitePool: pool, durationDays: 30 },
  features: { whatsAppTemplates: 0 },
  setupFeeAmount: 0,
  featureBullets: { ar: PREMIUM_MONTHLY_BULLETS_AR, en: PREMIUM_MONTHLY_BULLETS_EN },
  sortOrder: pool,
});

const businessEventPlan = (invites, price) => ({
  nameAr: `هلا أعمال ${invites} دعوة`,
  nameEn: `Halaa Business ${invites} Invites`,
  planType: PLAN_TYPES.BUSINESS_EVENT,
  planFamily: 'business',
  billingType: 'event',
  availableFor: PLAN_AVAILABILITY.BUSINESS,
  pricing: { oneTime: price },
  currency: 'SAR',
  limits: { maxEvents: 1, maxInvitesPerEvent: invites, invitePool: invites, durationDays: 90 },
  features: { whatsAppTemplates: 1 },
  setupFeeAmount: 1200,
  featureBullets: { ar: BUSINESS_EVENT_BULLETS_AR, en: BUSINESS_EVENT_BULLETS_EN },
  sortOrder: invites,
});

// =============================================================================
// PLAN_DEFAULTS — 34 entries total (six-tier catalog).
// Canonical per DEC-01 (signed 2026-07-01): keep six-tier / 34 plans; the
// ten-tier plans-rewrite-2026-05 signoff is explicitly superseded. Do NOT
// restore the 250/300/350/400 tiers. Store products are generated from this
// catalog by labbe-backend-/scripts/generateStoreCatalog.js (CAT-01).
// =============================================================================
const PLAN_DEFAULTS = {
  [PLAN_CODES.TRIAL]: {
    nameAr: 'تجريبي',
    nameEn: 'Trial',
    descriptionAr: 'الباقة التجريبية المجانية — مناسبة واحدة بعدد ٥ مدعوين لمدة ٩٠ يومًا',
    descriptionEn: 'Free trial plan — one event with 5 guests, valid for 90 days',
    planType: PLAN_TYPES.TRIAL,
    planFamily: null,
    billingType: 'event',
    availableFor: PLAN_AVAILABILITY.HOST,
    pricing: { oneTime: 0 },
    currency: 'SAR',
    limits: { maxEvents: 1, maxInvitesPerEvent: 5, invitePool: 5, durationDays: 90 },
    features: { whatsAppTemplates: 0 },
    setupFeeAmount: 0,
    featureBullets: { ar: [], en: [] },
    sortOrder: 0,
  },

  // ─── Basic event (6 tiers, 25 → 200) ─────────────────────────────
  [PLAN_CODES.BASIC_EVENT_25]:  basicEventPlan(25,  95),
  [PLAN_CODES.BASIC_EVENT_50]:  basicEventPlan(50,  185),
  [PLAN_CODES.BASIC_EVENT_75]:  basicEventPlan(75,  270),
  [PLAN_CODES.BASIC_EVENT_100]: basicEventPlan(100, 350),
  [PLAN_CODES.BASIC_EVENT_150]: basicEventPlan(150, 525),
  [PLAN_CODES.BASIC_EVENT_200]: basicEventPlan(200, 700),

  // ─── Basic monthly (6 tiers, 25 → 200) ───────────────────────────
  [PLAN_CODES.BASIC_MONTHLY_25]:  basicMonthlyPlan(25,  125),
  [PLAN_CODES.BASIC_MONTHLY_50]:  basicMonthlyPlan(50,  240),
  [PLAN_CODES.BASIC_MONTHLY_75]:  basicMonthlyPlan(75,  350),
  [PLAN_CODES.BASIC_MONTHLY_100]: basicMonthlyPlan(100, 450),
  [PLAN_CODES.BASIC_MONTHLY_150]: basicMonthlyPlan(150, 675),
  [PLAN_CODES.BASIC_MONTHLY_200]: basicMonthlyPlan(200, 900),

  // ─── Premium event (6 tiers, 25 → 200) ───────────────────────────
  [PLAN_CODES.PREMIUM_EVENT_25]:  premiumEventPlan(25,  120),
  [PLAN_CODES.PREMIUM_EVENT_50]:  premiumEventPlan(50,  235),
  [PLAN_CODES.PREMIUM_EVENT_75]:  premiumEventPlan(75,  345),
  [PLAN_CODES.PREMIUM_EVENT_100]: premiumEventPlan(100, 450),
  [PLAN_CODES.PREMIUM_EVENT_150]: premiumEventPlan(150, 675),
  [PLAN_CODES.PREMIUM_EVENT_200]: premiumEventPlan(200, 900),

  // ─── Premium monthly (6 tiers, 25 → 200) ─────────────────────────
  [PLAN_CODES.PREMIUM_MONTHLY_25]:  premiumMonthlyPlan(25,  150),
  [PLAN_CODES.PREMIUM_MONTHLY_50]:  premiumMonthlyPlan(50,  285),
  [PLAN_CODES.PREMIUM_MONTHLY_75]:  premiumMonthlyPlan(75,  420),
  [PLAN_CODES.PREMIUM_MONTHLY_100]: premiumMonthlyPlan(100, 540),
  [PLAN_CODES.PREMIUM_MONTHLY_150]: premiumMonthlyPlan(150, 810),
  [PLAN_CODES.PREMIUM_MONTHLY_200]: premiumMonthlyPlan(200, 1080),

  // ─── Business event (6 tiers, 25 → 200) ──────────────────────────
  [PLAN_CODES.BUSINESS_EVENT_25]:  businessEventPlan(25,  100),
  [PLAN_CODES.BUSINESS_EVENT_50]:  businessEventPlan(50,  195),
  [PLAN_CODES.BUSINESS_EVENT_75]:  businessEventPlan(75,  285),
  [PLAN_CODES.BUSINESS_EVENT_100]: businessEventPlan(100, 370),
  [PLAN_CODES.BUSINESS_EVENT_150]: businessEventPlan(150, 540),
  [PLAN_CODES.BUSINESS_EVENT_200]: businessEventPlan(200, 700),

  // ─── Business time-based ─────────────────────────────────────────
  [PLAN_CODES.BUSINESS_QUARTERLY]: {
    nameAr: 'هلا أعمال — اشتراك ٣ أشهر',
    nameEn: 'Halaa Business — 3-Month Subscription',
    planType: PLAN_TYPES.BUSINESS_QUARTERLY,
    planFamily: 'business',
    billingType: 'quarterly',
    availableFor: PLAN_AVAILABILITY.BUSINESS,
    pricing: { oneTime: 3000 },
    currency: 'SAR',
    limits: { maxEvents: -1, maxInvitesPerEvent: null, invitePool: 500, durationDays: 90 },
    features: { whatsAppTemplates: 3 },
    setupFeeAmount: 0,
    featureBullets: { ar: BUSINESS_QUARTERLY_BULLETS_AR, en: BUSINESS_QUARTERLY_BULLETS_EN },
    sortOrder: 1000,
  },

  [PLAN_CODES.BUSINESS_ANNUAL]: {
    nameAr: 'هلا أعمال — اشتراك سنوي',
    nameEn: 'Halaa Business — Annual Subscription',
    planType: PLAN_TYPES.BUSINESS_ANNUAL,
    planFamily: 'business',
    billingType: 'annual',
    availableFor: PLAN_AVAILABILITY.BUSINESS,
    pricing: { oneTime: 10000 },
    currency: 'SAR',
    limits: { maxEvents: -1, maxInvitesPerEvent: null, invitePool: 2000, durationDays: 365 },
    features: { whatsAppTemplates: 10 },
    setupFeeAmount: 0,
    featureBullets: { ar: BUSINESS_ANNUAL_BULLETS_AR, en: BUSINESS_ANNUAL_BULLETS_EN },
    sortOrder: 2000,
  },

  [PLAN_CODES.UNLIMITED]: {
    nameAr: 'باقة المسؤولين',
    nameEn: 'Admin Plan',
    descriptionAr: 'باقة المسؤولين — وصول كامل بدون حدود',
    descriptionEn: 'Admin plan — full unlimited access',
    planType: PLAN_TYPES.UNLIMITED,
    planFamily: null,
    billingType: null,
    availableFor: PLAN_AVAILABILITY.PLATFORM_ADMIN,
    pricing: { oneTime: 0 },
    currency: 'SAR',
    limits: { maxEvents: -1, maxInvitesPerEvent: -1, invitePool: null, durationDays: null },
    features: { whatsAppTemplates: 0 },
    setupFeeAmount: 0,
    featureBullets: { ar: [], en: [] },
    sortOrder: 9999,
  },
};

module.exports = { PLAN_DEFAULTS };
