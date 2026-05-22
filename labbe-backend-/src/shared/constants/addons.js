const ADDON_TYPES = {
  EXTRA_INVITES: 'extra_invites',
  EXTRA_REMINDERS: 'extra_reminders',
  DESIGN_TEMPLATE: 'design_template',
  BUSINESS_CUSTOMIZATION: 'business_customization',
};

const EXTRA_INVITES_TIERS = [
  { quantity: 10, price: 40 },
  { quantity: 20, price: 75 },
  { quantity: 30, price: 105 },
  { quantity: 40, price: 130 },
  { quantity: 50, price: 150 },
];

// Mirror EXTRA_INVITES_TIERS exactly. 1 reminder = 1 guest message.
const EXTRA_REMINDERS_TIERS = [
  { quantity: 10, price: 40 },
  { quantity: 20, price: 75 },
  { quantity: 30, price: 105 },
  { quantity: 40, price: 130 },
  { quantity: 50, price: 150 },
];

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

module.exports = { ADDON_TYPES, EXTRA_INVITES_TIERS, EXTRA_REMINDERS_TIERS, DESIGN_TEMPLATE_TIERS, BUSINESS_CUSTOMIZATION };
