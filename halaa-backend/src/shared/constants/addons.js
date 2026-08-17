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

module.exports = { ADDON_TYPES, EXTRA_INVITES_TIERS, EXTRA_INVITES_PRICE_PER_INVITE, DESIGN_TEMPLATE_TIERS, BUSINESS_CUSTOMIZATION };
