const { PLAN_CODES, PLAN_TYPES, PLAN_AVAILABILITY } = require('./plans');

// =============================================================================
// FEATURE BULLETS — authored per §4 of docs/plans-rewrite-2026-05.md.
// These strings are persisted on each Plan document under `featureBullets`
// and rendered verbatim by <PlanDescription>. Editing here re-seeds them
// into the DB the next time `node scripts/seedPlans.js` runs.
// =============================================================================

// ──── Basic event (14 bullets) ────
const BASIC_EVENT_BULLETS_AR = [
  'إنشاء وإدارة المناسبة بالكامل من خلال تطبيق ومنصة هلا بواسطة العميل',
  'إدخال بيانات المدعوين يدويًا أو عبر رفع ملف',
  'إرسال الدعوات ذاتيًا عبر (تطبيق الواتساب أو الرسائل النصية SMS)',
  'إمكانية تعيين داعي إضافي للمناسبة',
  'إرسال تذكير تلقائي للمدعوين قبل المناسبة بيوم',
  'لوحة إحصائيات فورية توضح (القبول – الاعتذار – عدم الرد)',
  'توليد باركود دخول خاص لكل مدعو بالاسم ورقم الجوال (بحسب الرغبة)',
  'مسح باركود الدخول مباشرة من تطبيق هلا بدون الحاجة لأي جهاز إضافي',
  'إمكانية تعيين أي شخص كمشرف لمسح أكواد الدخول (مشرف البوابة)',
  'الاختيار من مكتبة تصاميم جاهزة متنوعة تناسب جميع المناسبات أو طلب خدمة التصميم برسوم إضافية',
  'إرسال تذكير تلقائي للمدعوين قبل المناسبة مع جدول توقيت الإرسال بناء على رغبة العميل',
  'استقبال رسائل المدعوين (شكر – دعاء – تهنئة) داخل التطبيق',
  'إرسال دعوة تجريبية قبل الإرسال النهائي وتفعيل ارسال جميع الدعوات',
  'رصيد دعوات تعويضية في حال اعتذار المدعوين',
];

const BASIC_EVENT_BULLETS_EN = [
  'Create and manage the entire event through the Halaa app and platform by the customer',
  'Add guest data manually or via file upload',
  'Send invitations independently via (WhatsApp or SMS)',
  'Ability to assign an additional inviter to the event',
  'Automatic reminder to guests one day before the event',
  'Real-time stats dashboard (acceptance – apology – no response)',
  'Generate a unique entry barcode for each guest by name and mobile number (optional)',
  'Scan entry barcodes directly from the Halaa app — no extra device needed',
  'Ability to assign anyone as a check-in supervisor (gate supervisor)',
  'Choose from a library of ready-made designs covering all occasions, or request custom design for an additional fee',
  'Automatic reminders to guests before the event with a customizable send-time schedule',
  'Receive guest messages (thanks – prayers – congratulations) inside the app',
  'Send a trial invitation before finalizing and activating bulk send',
  'Compensation invites credit when guests apologize',
];

// ──── Basic monthly (14 bullets — bullet #1 swapped, #2-#14 identical to event) ────
const BASIC_MONTHLY_BULLETS_AR = [
  'إنشاء وإدارة عدد لا محدود من المناسبات بالكامل من خلال تطبيق ومنصة هلا بواسطة العميل',
  ...BASIC_EVENT_BULLETS_AR.slice(1),
];

const BASIC_MONTHLY_BULLETS_EN = [
  'Create and manage unlimited events through the Halaa app and platform by the customer',
  ...BASIC_EVENT_BULLETS_EN.slice(1),
];

// ──── Premium (6 bullets — same for event and monthly; rendered after the "All Basic features +" heading) ────
const PREMIUM_BULLETS_AR = [
  'إدارة كاملة للمناسبة من قبل فريق دعم منصة هلا',
  'إدخال وتنظيم بيانات المدعوين نيابةً عن العميل',
  'إعداد وإرسال الدعوات ومتابعتها',
  'ضبط التذكيرات والردود وتقارير الحضور',
  'متابعة مباشرة لحالة الدعوات والتأكد من وصولها',
  'دعم مخصص قبل وأثناء المناسبة',
];

const PREMIUM_BULLETS_EN = [
  'Full event management by the Halaa platform support team',
  'Guest data entry and organization on behalf of the customer',
  'Invitation preparation, sending, and follow-up',
  'Reminder, response, and attendance reporting setup',
  'Direct tracking of invitation delivery status',
  'Dedicated support before and during the event',
];

// ──── Business (8 bullets — same across event/quarterly/annual) ────
const BUSINESS_BULLETS_AR = [
  'إدارة كاملة لحساب المنشأة من قبل فريق دعم منصة هلا',
  'جميع مميزات باقات الأفراد',
  'خدمة عملاء مميزة',
  'إرسال الدعوات باسم ورقم الجوال الرسمي للجهة (يتطلب الربط مع مزود خدمة الواتساب ورسوم إضافية)',
  'تخصيص صفحة ويب خاصة للدعوة بألوان وهوية الجهة مع إضافة الشعار الرسمي',
  'تصميم الدعوات بما يتوافق مع ثيم المناسبة وهوية الجهة',
  'تخصيص قوالب رسائل واتساب معتمدة باسم الجهة',
  'دعم فعاليات متعددة من نفس الحساب',
];

const BUSINESS_BULLETS_EN = [
  'Full account management by the Halaa platform support team',
  'All features of the individual plans included',
  'Premium customer service',
  "Send invitations under the organization's official name and mobile number (requires WhatsApp Business provider integration and additional fees)",
  "Custom-branded invitation web page with the organization's colors, identity, and official logo",
  'Invitation designs aligned with the event theme and organization identity',
  "Custom WhatsApp message templates approved under the organization's name",
  'Multi-event support from the same account',
];

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
  limits: { maxEvents: 1, maxInvitesPerEvent: invites, invitePool: null, durationDays: 90 },
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
  limits: { maxEvents: 1, maxInvitesPerEvent: invites, invitePool: null, durationDays: 90 },
  features: { whatsAppTemplates: 0 },
  setupFeeAmount: 0,
  featureBullets: { ar: PREMIUM_BULLETS_AR, en: PREMIUM_BULLETS_EN },
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
  featureBullets: { ar: PREMIUM_BULLETS_AR, en: PREMIUM_BULLETS_EN },
  sortOrder: pool,
});

const businessEventPlan = (invites, price) => ({
  nameAr: `هلا أعمال ${invites} دعوة`,
  nameEn: `Halaa Business ${invites} Invites`,
  planType: PLAN_TYPES.BUSINESS_EVENT,
  planFamily: 'business',
  billingType: 'event',
  availableFor: PLAN_AVAILABILITY.WHITELABEL,
  pricing: { oneTime: price },
  currency: 'SAR',
  limits: { maxEvents: 1, maxInvitesPerEvent: invites, invitePool: null, durationDays: 90 },
  features: { whatsAppTemplates: 1 },
  setupFeeAmount: 1200,
  featureBullets: { ar: BUSINESS_BULLETS_AR, en: BUSINESS_BULLETS_EN },
  sortOrder: invites,
});

// =============================================================================
// PLAN_DEFAULTS — 54 entries total
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
    limits: { maxEvents: 1, maxInvitesPerEvent: 5, invitePool: null, durationDays: 90 },
    features: { whatsAppTemplates: 0 },
    setupFeeAmount: 0,
    featureBullets: { ar: [], en: [] },
    sortOrder: 0,
  },

  // ─── Basic event (10 tiers, 25 → 400) ────────────────────────────
  [PLAN_CODES.BASIC_EVENT_25]:  basicEventPlan(25,  95),
  [PLAN_CODES.BASIC_EVENT_50]:  basicEventPlan(50,  185),
  [PLAN_CODES.BASIC_EVENT_75]:  basicEventPlan(75,  270),
  [PLAN_CODES.BASIC_EVENT_100]: basicEventPlan(100, 350),
  [PLAN_CODES.BASIC_EVENT_150]: basicEventPlan(150, 525),
  [PLAN_CODES.BASIC_EVENT_200]: basicEventPlan(200, 700),
  [PLAN_CODES.BASIC_EVENT_250]: basicEventPlan(250, 875),
  [PLAN_CODES.BASIC_EVENT_300]: basicEventPlan(300, 1050),
  [PLAN_CODES.BASIC_EVENT_350]: basicEventPlan(350, 1225),
  [PLAN_CODES.BASIC_EVENT_400]: basicEventPlan(400, 1400),

  // ─── Basic monthly (10 tiers, 25 → 400) ──────────────────────────
  [PLAN_CODES.BASIC_MONTHLY_25]:  basicMonthlyPlan(25,  125),
  [PLAN_CODES.BASIC_MONTHLY_50]:  basicMonthlyPlan(50,  240),
  [PLAN_CODES.BASIC_MONTHLY_75]:  basicMonthlyPlan(75,  350),
  [PLAN_CODES.BASIC_MONTHLY_100]: basicMonthlyPlan(100, 450),
  [PLAN_CODES.BASIC_MONTHLY_150]: basicMonthlyPlan(150, 675),
  [PLAN_CODES.BASIC_MONTHLY_200]: basicMonthlyPlan(200, 900),
  [PLAN_CODES.BASIC_MONTHLY_250]: basicMonthlyPlan(250, 1125),
  [PLAN_CODES.BASIC_MONTHLY_300]: basicMonthlyPlan(300, 1350),
  [PLAN_CODES.BASIC_MONTHLY_350]: basicMonthlyPlan(350, 1575),
  [PLAN_CODES.BASIC_MONTHLY_400]: basicMonthlyPlan(400, 1800),

  // ─── Premium event (10 tiers, 25 → 400) ──────────────────────────
  [PLAN_CODES.PREMIUM_EVENT_25]:  premiumEventPlan(25,  120),
  [PLAN_CODES.PREMIUM_EVENT_50]:  premiumEventPlan(50,  235),
  [PLAN_CODES.PREMIUM_EVENT_75]:  premiumEventPlan(75,  345),
  [PLAN_CODES.PREMIUM_EVENT_100]: premiumEventPlan(100, 450),
  [PLAN_CODES.PREMIUM_EVENT_150]: premiumEventPlan(150, 675),
  [PLAN_CODES.PREMIUM_EVENT_200]: premiumEventPlan(200, 900),
  [PLAN_CODES.PREMIUM_EVENT_250]: premiumEventPlan(250, 1125),
  [PLAN_CODES.PREMIUM_EVENT_300]: premiumEventPlan(300, 1350),
  [PLAN_CODES.PREMIUM_EVENT_350]: premiumEventPlan(350, 1575),
  [PLAN_CODES.PREMIUM_EVENT_400]: premiumEventPlan(400, 1800),

  // ─── Premium monthly (10 tiers, 25 → 400) ────────────────────────
  [PLAN_CODES.PREMIUM_MONTHLY_25]:  premiumMonthlyPlan(25,  150),
  [PLAN_CODES.PREMIUM_MONTHLY_50]:  premiumMonthlyPlan(50,  285),
  [PLAN_CODES.PREMIUM_MONTHLY_75]:  premiumMonthlyPlan(75,  420),
  [PLAN_CODES.PREMIUM_MONTHLY_100]: premiumMonthlyPlan(100, 540),
  [PLAN_CODES.PREMIUM_MONTHLY_150]: premiumMonthlyPlan(150, 810),
  [PLAN_CODES.PREMIUM_MONTHLY_200]: premiumMonthlyPlan(200, 1080),
  [PLAN_CODES.PREMIUM_MONTHLY_250]: premiumMonthlyPlan(250, 1350),
  [PLAN_CODES.PREMIUM_MONTHLY_300]: premiumMonthlyPlan(300, 1620),
  [PLAN_CODES.PREMIUM_MONTHLY_350]: premiumMonthlyPlan(350, 1890),
  [PLAN_CODES.PREMIUM_MONTHLY_400]: premiumMonthlyPlan(400, 2160),

  // ─── Business event (10 tiers, 25 → 400; no 500) ─────────────────
  [PLAN_CODES.BUSINESS_EVENT_25]:  businessEventPlan(25,  100),
  [PLAN_CODES.BUSINESS_EVENT_50]:  businessEventPlan(50,  195),
  [PLAN_CODES.BUSINESS_EVENT_75]:  businessEventPlan(75,  285),
  [PLAN_CODES.BUSINESS_EVENT_100]: businessEventPlan(100, 370),
  [PLAN_CODES.BUSINESS_EVENT_150]: businessEventPlan(150, 540),
  [PLAN_CODES.BUSINESS_EVENT_200]: businessEventPlan(200, 700),
  [PLAN_CODES.BUSINESS_EVENT_250]: businessEventPlan(250, 875),
  [PLAN_CODES.BUSINESS_EVENT_300]: businessEventPlan(300, 1050),
  [PLAN_CODES.BUSINESS_EVENT_350]: businessEventPlan(350, 1225),
  [PLAN_CODES.BUSINESS_EVENT_400]: businessEventPlan(400, 1400),

  // ─── Business time-based ─────────────────────────────────────────
  [PLAN_CODES.BUSINESS_QUARTERLY]: {
    nameAr: 'هلا أعمال — اشتراك ٣ أشهر',
    nameEn: 'Halaa Business — 3-Month Subscription',
    planType: PLAN_TYPES.BUSINESS_QUARTERLY,
    planFamily: 'business',
    billingType: 'quarterly',
    availableFor: PLAN_AVAILABILITY.WHITELABEL,
    pricing: { oneTime: 3000 },
    currency: 'SAR',
    limits: { maxEvents: -1, maxInvitesPerEvent: null, invitePool: 500, durationDays: 90 },
    features: { whatsAppTemplates: 3 },
    setupFeeAmount: 0,
    featureBullets: { ar: BUSINESS_BULLETS_AR, en: BUSINESS_BULLETS_EN },
    sortOrder: 1000,
  },

  [PLAN_CODES.BUSINESS_ANNUAL]: {
    nameAr: 'هلا أعمال — اشتراك سنوي',
    nameEn: 'Halaa Business — Annual Subscription',
    planType: PLAN_TYPES.BUSINESS_ANNUAL,
    planFamily: 'business',
    billingType: 'annual',
    availableFor: PLAN_AVAILABILITY.WHITELABEL,
    pricing: { oneTime: 10000 },
    currency: 'SAR',
    limits: { maxEvents: -1, maxInvitesPerEvent: null, invitePool: 2000, durationDays: 365 },
    features: { whatsAppTemplates: 5 },
    setupFeeAmount: 0,
    featureBullets: { ar: BUSINESS_BULLETS_AR, en: BUSINESS_BULLETS_EN },
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
