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
  BASIC_EVENT_25: 'basic_event_25',   BASIC_EVENT_50: 'basic_event_50',
  BASIC_EVENT_75: 'basic_event_75',   BASIC_EVENT_100: 'basic_event_100',
  BASIC_EVENT_150: 'basic_event_150', BASIC_EVENT_200: 'basic_event_200',
  BASIC_EVENT_250: 'basic_event_250', BASIC_EVENT_300: 'basic_event_300',
  BASIC_MONTHLY_100: 'basic_monthly_100', BASIC_MONTHLY_150: 'basic_monthly_150',
  BASIC_MONTHLY_200: 'basic_monthly_200', BASIC_MONTHLY_250: 'basic_monthly_250',
  BASIC_MONTHLY_300: 'basic_monthly_300',
  PREMIUM_EVENT_25: 'premium_event_25',   PREMIUM_EVENT_50: 'premium_event_50',
  PREMIUM_EVENT_75: 'premium_event_75',   PREMIUM_EVENT_100: 'premium_event_100',
  PREMIUM_EVENT_150: 'premium_event_150', PREMIUM_EVENT_200: 'premium_event_200',
  PREMIUM_EVENT_250: 'premium_event_250', PREMIUM_EVENT_300: 'premium_event_300',
  PREMIUM_MONTHLY_100: 'premium_monthly_100', PREMIUM_MONTHLY_150: 'premium_monthly_150',
  PREMIUM_MONTHLY_200: 'premium_monthly_200', PREMIUM_MONTHLY_250: 'premium_monthly_250',
  PREMIUM_MONTHLY_300: 'premium_monthly_300',
  BUSINESS_EVENT_100: 'business_event_100', BUSINESS_EVENT_150: 'business_event_150',
  BUSINESS_EVENT_200: 'business_event_200', BUSINESS_EVENT_300: 'business_event_300',
  BUSINESS_EVENT_400: 'business_event_400', BUSINESS_EVENT_500: 'business_event_500',
  BUSINESS_QUARTERLY: 'business_quarterly',
  BUSINESS_ANNUAL: 'business_annual',
  UNLIMITED: 'unlimited',
};

const PLAN_AVAILABILITY = {
  HOST: 'host',
  WHITELABEL: 'whitelabel',
  PLATFORM_ADMIN: 'platform_admin',
};

const COMPENSATION_PERCENTAGE = 10;
const BUSINESS_SETUP_FEE = 1200;

const FEATURE_LABELS = {
  hasInAppInvites:         { labelAr: 'إرسال الدعوات من التطبيق',      labelEn: 'Send invitations from app',     icon: 'mobile'   },
  hasWhatsAppInvites:      { labelAr: 'إرسال رسائل واتساب',             labelEn: 'WhatsApp messaging',            icon: 'whatsapp' },
  hasSMSInvites:           { labelAr: 'إرسال رسائل نصية SMS',           labelEn: 'SMS messaging',                 icon: 'sms'      },
  hasQRCode:               { labelAr: 'إنشاء رموز QR للضيوف',          labelEn: 'QR code generation for guests', icon: 'qrcode'   },
  hasQRScanning:           { labelAr: 'مسح QR للدخول',                  labelEn: 'QR scanning for entry',         icon: 'scan'     },
  hasFlexibleEntryMode:    { labelAr: 'وضع دخول مرن',                   labelEn: 'Flexible entry mode',           icon: 'flexible' },
  hasStaffCheckIn:         { labelAr: 'تعيين موظفين للمسح',            labelEn: 'Staff check-in assignment',     icon: 'staff'    },
  hasStaffAssignment:       { labelAr: 'تعيين فريق العمل',              labelEn: 'Staff assignment',              icon: 'gate'     },
  hasRSVPTracking:         { labelAr: 'استقبال ردود الضيوف',           labelEn: 'Guest RSVP tracking',           icon: 'reply'    },
  hasAutoReminders:        { labelAr: 'تذكيرات تلقائية',               labelEn: 'Automatic reminders',           icon: 'reminder' },
  hasEmailNotifications:   { labelAr: 'إشعارات البريد الإلكتروني',     labelEn: 'Email notifications',           icon: 'email'    },
  hasCompensationInvites:  { labelAr: 'دعوات تعويضية',                 labelEn: 'Compensation invites',          icon: 'gift'     },
  hasBasicTemplates:       { labelAr: 'قوالب دعوات أساسية',           labelEn: 'Basic invitation templates',    icon: 'template' },
  hasPremiumTemplates:     { labelAr: 'قوالب دعوات مميزة',             labelEn: 'Premium invitation templates',  icon: 'premium'  },
  hasCustomReports:        { labelAr: 'تقارير مخصصة',                  labelEn: 'Custom reports',                icon: 'report'   },
  hasWhatsAppSupport:      { labelAr: 'دعم فني عبر واتساب',            labelEn: 'WhatsApp support',              icon: 'support'  },
  hasCustomWhatsAppNumber: { labelAr: 'رقم واتساب مخصص',               labelEn: 'Custom WhatsApp number',        icon: 'phone'    },
  hasOfficialSenderNumber: { labelAr: 'رقم مرسل رسمي',                 labelEn: 'Official sender number',        icon: 'verified' },
  hasCustomWebPage:        { labelAr: 'صفحة ويب مخصصة بهوية الجهة',   labelEn: 'Custom branded web page',       icon: 'web'      },
  hasMessageTracking:      { labelAr: 'تتبع الرسائل لحظياً',           labelEn: 'Real-time message tracking',    icon: 'tracking' },
  whatsAppTemplates:       { labelAr: 'قوالب واتساب',                   labelEn: 'WhatsApp templates',            icon: 'template' },
};

const buildFeaturesArray = (features) => {
  if (!features) return [];
  return Object.entries(FEATURE_LABELS)
    .filter(([key]) => features[key])
    .map(([key, label]) => ({ key, labelEn: label.labelEn, labelAr: label.labelAr, icon: label.icon }));
};

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
  COMPENSATION_PERCENTAGE, BUSINESS_SETUP_FEE, FEATURE_LABELS, buildFeaturesArray,
  isUnlimited, isPerEventPlan, isPoolPlan, isManagedPlan, getPlanFamily, getBillingType,
};
