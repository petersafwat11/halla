const PLAN_TYPES = {
  TRIAL: 'trial',
  BASIC_EVENT: 'basic_event',
  BASIC_MONTHLY: 'basic_monthly',
  PREMIUM_EVENT: 'premium_event',
  PREMIUM_MONTHLY: 'premium_monthly',
  BUSINESS_EVENT: 'business_event',
  BUSINESS_QUARTERLY: 'business_quarterly',
  BUSINESS_ANNUAL: 'business_annual',
  UNLIMITED: 'unlimited',
};

const PLAN_FAMILIES = {
  BASIC: 'basic',
  PREMIUM: 'premium',
  BUSINESS: 'business',
};

const BILLING_TYPES = {
  EVENT: 'event',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  ANNUAL: 'annual',
};

const PLAN_CODES = {
  TRIAL: 'trial',

  // Basic event — 10 tiers (25 → 400)
  BASIC_EVENT_25:  'basic_event_25',   BASIC_EVENT_50:  'basic_event_50',
  BASIC_EVENT_75:  'basic_event_75',   BASIC_EVENT_100: 'basic_event_100',
  BASIC_EVENT_150: 'basic_event_150',  BASIC_EVENT_200: 'basic_event_200',
  BASIC_EVENT_250: 'basic_event_250',  BASIC_EVENT_300: 'basic_event_300',
  BASIC_EVENT_350: 'basic_event_350',  BASIC_EVENT_400: 'basic_event_400',

  // Basic monthly — 10 tiers (25 → 400)
  BASIC_MONTHLY_25:  'basic_monthly_25',   BASIC_MONTHLY_50:  'basic_monthly_50',
  BASIC_MONTHLY_75:  'basic_monthly_75',   BASIC_MONTHLY_100: 'basic_monthly_100',
  BASIC_MONTHLY_150: 'basic_monthly_150',  BASIC_MONTHLY_200: 'basic_monthly_200',
  BASIC_MONTHLY_250: 'basic_monthly_250',  BASIC_MONTHLY_300: 'basic_monthly_300',
  BASIC_MONTHLY_350: 'basic_monthly_350',  BASIC_MONTHLY_400: 'basic_monthly_400',

  // Premium event — 10 tiers (25 → 400)
  PREMIUM_EVENT_25:  'premium_event_25',   PREMIUM_EVENT_50:  'premium_event_50',
  PREMIUM_EVENT_75:  'premium_event_75',   PREMIUM_EVENT_100: 'premium_event_100',
  PREMIUM_EVENT_150: 'premium_event_150',  PREMIUM_EVENT_200: 'premium_event_200',
  PREMIUM_EVENT_250: 'premium_event_250',  PREMIUM_EVENT_300: 'premium_event_300',
  PREMIUM_EVENT_350: 'premium_event_350',  PREMIUM_EVENT_400: 'premium_event_400',

  // Premium monthly — 10 tiers (25 → 400)
  PREMIUM_MONTHLY_25:  'premium_monthly_25',   PREMIUM_MONTHLY_50:  'premium_monthly_50',
  PREMIUM_MONTHLY_75:  'premium_monthly_75',   PREMIUM_MONTHLY_100: 'premium_monthly_100',
  PREMIUM_MONTHLY_150: 'premium_monthly_150',  PREMIUM_MONTHLY_200: 'premium_monthly_200',
  PREMIUM_MONTHLY_250: 'premium_monthly_250',  PREMIUM_MONTHLY_300: 'premium_monthly_300',
  PREMIUM_MONTHLY_350: 'premium_monthly_350',  PREMIUM_MONTHLY_400: 'premium_monthly_400',

  // Business event — 10 tiers (25 → 400, no 500)
  BUSINESS_EVENT_25:  'business_event_25',   BUSINESS_EVENT_50:  'business_event_50',
  BUSINESS_EVENT_75:  'business_event_75',   BUSINESS_EVENT_100: 'business_event_100',
  BUSINESS_EVENT_150: 'business_event_150',  BUSINESS_EVENT_200: 'business_event_200',
  BUSINESS_EVENT_250: 'business_event_250',  BUSINESS_EVENT_300: 'business_event_300',
  BUSINESS_EVENT_350: 'business_event_350',  BUSINESS_EVENT_400: 'business_event_400',

  // Business time-based
  BUSINESS_QUARTERLY: 'business_quarterly',
  BUSINESS_ANNUAL:    'business_annual',

  UNLIMITED: 'unlimited',
};

const PLAN_AVAILABILITY = {
  HOST: 'host',
  WHITELABEL: 'whitelabel',
  PLATFORM_ADMIN: 'platform_admin',
};

const COMPENSATION_PERCENTAGE = 15;

const isUnlimited    = (value) => value === -1;
const isPerEventPlan = (planType) => ['basic_event', 'premium_event', 'business_event', 'trial'].includes(planType);
const isPoolPlan     = (planType) => ['basic_monthly', 'premium_monthly', 'business_quarterly', 'business_annual'].includes(planType);
const isManagedPlan  = (planType) => ['premium_event', 'premium_monthly', 'business_event', 'business_quarterly', 'business_annual'].includes(planType);
const getPlanFamily  = (planType) => {
  if (['basic_event', 'basic_monthly'].includes(planType)) return 'basic';
  if (['premium_event', 'premium_monthly'].includes(planType)) return 'premium';
  if (['business_event', 'business_quarterly', 'business_annual'].includes(planType)) return 'business';
  return null;
};
const getBillingType = (planType) => {
  if (['basic_event', 'premium_event', 'business_event', 'trial'].includes(planType)) return 'event';
  if (['basic_monthly', 'premium_monthly'].includes(planType)) return 'monthly';
  if (planType === 'business_quarterly') return 'quarterly';
  if (planType === 'business_annual') return 'annual';
  return null;
};

module.exports = {
  PLAN_TYPES, PLAN_FAMILIES, BILLING_TYPES, PLAN_CODES, PLAN_AVAILABILITY,
  COMPENSATION_PERCENTAGE,
  isUnlimited, isPerEventPlan, isPoolPlan, isManagedPlan, getPlanFamily, getBillingType,
};
