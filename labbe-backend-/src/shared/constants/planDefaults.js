const { PLAN_CODES, PLAN_TYPES, PLAN_AVAILABILITY, COMPENSATION_PERCENTAGE } = require('./plans');

const BASE_FEATURES = {
  hasInAppInvites: true, hasWhatsAppInvites: true, hasSMSInvites: true,
  hasQRCode: true, hasQRScanning: true, hasFlexibleEntryMode: true,
  hasStaffCheckIn: true, hasStaffAssignment: true,
  hasRSVPTracking: true, hasAutoReminders: true, hasEmailNotifications: true,
  hasCompensationInvites: true, compensationPercentage: COMPENSATION_PERCENTAGE,
  hasBasicTemplates: true, hasPremiumTemplates: false, hasPostEventPage: false,
  hasCustomWhatsAppNumber: false, hasOfficialSenderNumber: false,
  hasCustomWebPage: false, hasMessageTracking: false, hasCustomReports: false,
  priorityPoints: 1, hasWhatsAppSupport: true,
};

const PREMIUM_FEATURES  = { ...BASE_FEATURES, hasPremiumTemplates: true, priorityPoints: 2 };
const BUSINESS_FEATURES = {
  ...BASE_FEATURES,
  hasCustomWhatsAppNumber: true, hasOfficialSenderNumber: true,
  hasCustomWebPage: true, hasMessageTracking: true,
  hasPremiumTemplates: true, priorityPoints: 3,
};

const basicEventPlan   = (invites, price) => ({
  nameAr: `هلا بيسك ${invites} دعوة`, nameEn: `Halaa Basic ${invites} Invites`,
  planType: PLAN_TYPES.BASIC_EVENT, planFamily: 'basic', billingType: 'event',
  availableFor: PLAN_AVAILABILITY.HOST, pricing: { oneTime: price }, currency: 'SAR',
  limits: { maxEvents: 1, maxInvitesPerEvent: invites, invitePool: null, durationDays: 90 },
  features: { ...BASE_FEATURES },
});

const premiumEventPlan = (invites, price) => ({
  nameAr: `هلا بريميوم ${invites} دعوة`, nameEn: `Halaa Premium ${invites} Invites`,
  planType: PLAN_TYPES.PREMIUM_EVENT, planFamily: 'premium', billingType: 'event',
  availableFor: PLAN_AVAILABILITY.HOST, pricing: { oneTime: price }, currency: 'SAR',
  limits: { maxEvents: 1, maxInvitesPerEvent: invites, invitePool: null, durationDays: 90 },
  features: { ...PREMIUM_FEATURES },
});

const businessEventPlan = (invites, price) => ({
  nameAr: `هلا أعمال ${invites} دعوة`, nameEn: `Halaa Business ${invites} Invites`,
  planType: PLAN_TYPES.BUSINESS_EVENT, planFamily: 'business', billingType: 'event',
  availableFor: PLAN_AVAILABILITY.WHITELABEL, pricing: { oneTime: price }, currency: 'SAR',
  limits: { maxEvents: 1, maxInvitesPerEvent: invites, invitePool: null, durationDays: 90 },
  features: { ...BUSINESS_FEATURES },
});

const basicMonthlyPlan = (pool, price) => ({
  nameAr: `هلا بيسك شهري ${pool} دعوة`, nameEn: `Halaa Basic Monthly ${pool} Invites`,
  planType: PLAN_TYPES.BASIC_MONTHLY, planFamily: 'basic', billingType: 'monthly',
  availableFor: PLAN_AVAILABILITY.HOST, pricing: { oneTime: price }, currency: 'SAR',
  limits: { maxEvents: -1, maxInvitesPerEvent: null, invitePool: pool, durationDays: 30 },
  features: { ...BASE_FEATURES },
});

const premiumMonthlyPlan = (pool, price) => ({
  nameAr: `هلا بريميوم شهري ${pool} دعوة`, nameEn: `Halaa Premium Monthly ${pool} Invites`,
  planType: PLAN_TYPES.PREMIUM_MONTHLY, planFamily: 'premium', billingType: 'monthly',
  availableFor: PLAN_AVAILABILITY.HOST, pricing: { oneTime: price }, currency: 'SAR',
  limits: { maxEvents: -1, maxInvitesPerEvent: null, invitePool: pool, durationDays: 30 },
  features: { ...PREMIUM_FEATURES },
});

const PLAN_DEFAULTS = {
  [PLAN_CODES.TRIAL]: {
    nameAr: 'تجريبي', nameEn: 'Trial',
    planType: PLAN_TYPES.TRIAL, planFamily: null, billingType: 'event',
    availableFor: PLAN_AVAILABILITY.HOST, pricing: { oneTime: 0 }, currency: 'SAR',
    limits: { maxEvents: 1, maxInvitesPerEvent: 5, invitePool: null, durationDays: 90 },
    features: { ...BASE_FEATURES },
  },

  [PLAN_CODES.BASIC_EVENT_25]:  basicEventPlan(25,  95),
  [PLAN_CODES.BASIC_EVENT_50]:  basicEventPlan(50,  185),
  [PLAN_CODES.BASIC_EVENT_75]:  basicEventPlan(75,  270),
  [PLAN_CODES.BASIC_EVENT_100]: basicEventPlan(100, 350),
  [PLAN_CODES.BASIC_EVENT_150]: basicEventPlan(150, 525),
  [PLAN_CODES.BASIC_EVENT_200]: basicEventPlan(200, 700),
  [PLAN_CODES.BASIC_EVENT_250]: basicEventPlan(250, 875),
  [PLAN_CODES.BASIC_EVENT_300]: basicEventPlan(300, 1050),

  [PLAN_CODES.BASIC_MONTHLY_100]: basicMonthlyPlan(100, 450),
  [PLAN_CODES.BASIC_MONTHLY_150]: basicMonthlyPlan(150, 675),
  [PLAN_CODES.BASIC_MONTHLY_200]: basicMonthlyPlan(200, 900),
  [PLAN_CODES.BASIC_MONTHLY_250]: basicMonthlyPlan(250, 1125),
  [PLAN_CODES.BASIC_MONTHLY_300]: basicMonthlyPlan(300, 1350),

  [PLAN_CODES.PREMIUM_EVENT_25]:  premiumEventPlan(25,  120),
  [PLAN_CODES.PREMIUM_EVENT_50]:  premiumEventPlan(50,  235),
  [PLAN_CODES.PREMIUM_EVENT_75]:  premiumEventPlan(75,  345),
  [PLAN_CODES.PREMIUM_EVENT_100]: premiumEventPlan(100, 450),
  [PLAN_CODES.PREMIUM_EVENT_150]: premiumEventPlan(150, 675),
  [PLAN_CODES.PREMIUM_EVENT_200]: premiumEventPlan(200, 900),
  [PLAN_CODES.PREMIUM_EVENT_250]: premiumEventPlan(250, 1125),
  [PLAN_CODES.PREMIUM_EVENT_300]: premiumEventPlan(300, 1350),

  [PLAN_CODES.PREMIUM_MONTHLY_100]: premiumMonthlyPlan(100, 540),
  [PLAN_CODES.PREMIUM_MONTHLY_150]: premiumMonthlyPlan(150, 810),
  [PLAN_CODES.PREMIUM_MONTHLY_200]: premiumMonthlyPlan(200, 1080),
  [PLAN_CODES.PREMIUM_MONTHLY_250]: premiumMonthlyPlan(250, 1350),
  [PLAN_CODES.PREMIUM_MONTHLY_300]: premiumMonthlyPlan(300, 1620),

  [PLAN_CODES.BUSINESS_EVENT_100]: businessEventPlan(100, 370),
  [PLAN_CODES.BUSINESS_EVENT_150]: businessEventPlan(150, 540),
  [PLAN_CODES.BUSINESS_EVENT_200]: businessEventPlan(200, 700),
  [PLAN_CODES.BUSINESS_EVENT_300]: businessEventPlan(300, 1050),
  [PLAN_CODES.BUSINESS_EVENT_400]: businessEventPlan(400, 1400),
  [PLAN_CODES.BUSINESS_EVENT_500]: businessEventPlan(500, 1750),

  [PLAN_CODES.BUSINESS_QUARTERLY]: {
    nameAr: 'هلا أعمال ربع سنوي', nameEn: 'Halaa Business Quarterly',
    planType: PLAN_TYPES.BUSINESS_QUARTERLY, planFamily: 'business', billingType: 'quarterly',
    availableFor: PLAN_AVAILABILITY.WHITELABEL, pricing: { oneTime: 3500 }, currency: 'SAR',
    limits: { maxEvents: -1, maxInvitesPerEvent: null, invitePool: 500, durationDays: 90 },
    features: { ...BUSINESS_FEATURES, whatsAppTemplates: 3 },
  },

  [PLAN_CODES.BUSINESS_ANNUAL]: {
    nameAr: 'هلا أعمال سنوي', nameEn: 'Halaa Business Annual',
    planType: PLAN_TYPES.BUSINESS_ANNUAL, planFamily: 'business', billingType: 'annual',
    availableFor: PLAN_AVAILABILITY.WHITELABEL, pricing: { oneTime: 10000 }, currency: 'SAR',
    limits: { maxEvents: -1, maxInvitesPerEvent: null, invitePool: 2000, durationDays: 365 },
    features: { ...BUSINESS_FEATURES, whatsAppTemplates: 5 },
  },

  [PLAN_CODES.UNLIMITED]: {
    nameAr: 'غير محدود', nameEn: 'Unlimited',
    planType: PLAN_TYPES.UNLIMITED, planFamily: null, billingType: null,
    availableFor: PLAN_AVAILABILITY.PLATFORM_ADMIN, pricing: { oneTime: 0 }, currency: 'SAR',
    limits: { maxEvents: -1, maxInvitesPerEvent: -1, invitePool: null, durationDays: null },
    features: { ...BASE_FEATURES, compensationPercentage: 100, hasPremiumTemplates: true, hasCustomReports: true, priorityPoints: 5 },
  },
};

module.exports = { PLAN_DEFAULTS };
