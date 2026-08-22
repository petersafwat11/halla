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

  // Basic event — 6 tiers (25 → 200)
  BASIC_EVENT_25:  'basic_event_25',   BASIC_EVENT_50:  'basic_event_50',
  BASIC_EVENT_75:  'basic_event_75',   BASIC_EVENT_100: 'basic_event_100',
  BASIC_EVENT_150: 'basic_event_150',  BASIC_EVENT_200: 'basic_event_200',

  // Basic monthly — 6 tiers (25 → 200)
  BASIC_MONTHLY_25:  'basic_monthly_25',   BASIC_MONTHLY_50:  'basic_monthly_50',
  BASIC_MONTHLY_75:  'basic_monthly_75',   BASIC_MONTHLY_100: 'basic_monthly_100',
  BASIC_MONTHLY_150: 'basic_monthly_150',  BASIC_MONTHLY_200: 'basic_monthly_200',

  // Premium event — 6 tiers (25 → 200)
  PREMIUM_EVENT_25:  'premium_event_25',   PREMIUM_EVENT_50:  'premium_event_50',
  PREMIUM_EVENT_75:  'premium_event_75',   PREMIUM_EVENT_100: 'premium_event_100',
  PREMIUM_EVENT_150: 'premium_event_150',  PREMIUM_EVENT_200: 'premium_event_200',

  // Premium monthly — 6 tiers (25 → 200)
  PREMIUM_MONTHLY_25:  'premium_monthly_25',   PREMIUM_MONTHLY_50:  'premium_monthly_50',
  PREMIUM_MONTHLY_75:  'premium_monthly_75',   PREMIUM_MONTHLY_100: 'premium_monthly_100',
  PREMIUM_MONTHLY_150: 'premium_monthly_150',  PREMIUM_MONTHLY_200: 'premium_monthly_200',

  // Business event — 6 tiers (25 → 200)
  BUSINESS_EVENT_25:  'business_event_25',   BUSINESS_EVENT_50:  'business_event_50',
  BUSINESS_EVENT_75:  'business_event_75',   BUSINESS_EVENT_100: 'business_event_100',
  BUSINESS_EVENT_150: 'business_event_150',  BUSINESS_EVENT_200: 'business_event_200',

  // Business time-based
  BUSINESS_QUARTERLY: 'business_quarterly',
  BUSINESS_ANNUAL:    'business_annual',

  UNLIMITED: 'unlimited',
};

const PLAN_AVAILABILITY = {
  HOST: 'host',
  BUSINESS: 'business',
  PLATFORM_ADMIN: 'platform_admin',
};

const COMPENSATION_PERCENTAGE = 15;

const isUnlimited = (value) => value === -1;
// Trial detection — accepts EITHER the plan `planType` OR the plan `code`,
// since both are `'trial'` for the trial plan. Single source of truth so
// scheduling-window code stops doing ad-hoc `code === 'trial' ||
// planType === 'trial'` checks that drift apart.
const isTrialPlan = (planTypeOrCode) => planTypeOrCode === 'trial';
const isPerEventPlan = (planType) =>
  typeof planType === 'string' &&
  (planType.endsWith('_event') || planType === 'trial');
const isPoolPlan = (planType) =>
  typeof planType === 'string' &&
  (['basic_monthly', 'premium_monthly', 'business_quarterly', 'business_annual', 'unlimited'].includes(planType) ||
    planType.endsWith('_monthly') ||
    planType.endsWith('_quarterly') ||
    planType.endsWith('_annual'));
const isManagedPlan = (planType) =>
  typeof planType === 'string' &&
  (planType.startsWith('premium_') || planType.startsWith('business_'));

const BILLING_CYCLE_SUFFIXES = ['_monthly', '_quarterly', '_annual'];

const planHasBillingCycle = (planType) =>
  typeof planType === 'string' &&
  BILLING_CYCLE_SUFFIXES.some((suffix) => planType.endsWith(suffix));

const isRecurringBilling = (billingType) =>
  ['monthly', 'quarterly', 'annual'].includes(billingType);

const isRecurringPlan = (planType) =>
  typeof planType === 'string' &&
  (planType.endsWith('_monthly') ||
    planType.endsWith('_quarterly') ||
    planType.endsWith('_annual'));

const getPlanFamily = (planType) => {
  if (!planType || typeof planType !== 'string') return null;
  if (planType.startsWith('basic_')) return 'basic';
  if (planType.startsWith('premium_')) return 'premium';
  if (planType.startsWith('business_')) return 'business';
  return null;
};
const getBillingType = (planType) => {
  if (!planType || typeof planType !== 'string') return null;
  if (planType.endsWith('_event') || planType === 'trial') return 'event';
  if (planType.endsWith('_monthly')) return 'monthly';
  if (planType.endsWith('_quarterly') || planType === 'business_quarterly') return 'quarterly';
  if (planType.endsWith('_annual') || planType === 'business_annual') return 'annual';
  return null;
};

const getBillingPeriodKey = (billingTypeOrPlanType) => {
  if (!billingTypeOrPlanType || typeof billingTypeOrPlanType !== 'string') {
    return 'event';
  }
  if (['event', 'monthly', 'quarterly', 'annual'].includes(billingTypeOrPlanType)) {
    return billingTypeOrPlanType;
  }
  return getBillingType(billingTypeOrPlanType) || 'event';
};

module.exports = {
  PLAN_TYPES, PLAN_FAMILIES, BILLING_TYPES, PLAN_CODES, PLAN_AVAILABILITY,
  COMPENSATION_PERCENTAGE,
  isUnlimited, isTrialPlan, isPerEventPlan, isPoolPlan, isManagedPlan, getPlanFamily, getBillingType,
  isRecurringBilling, isRecurringPlan, getBillingPeriodKey, planHasBillingCycle,
};
