/**
 * Seed Vendor Showcase
 * --------------------
 * Populates the existing demo vendor (test.vendor@labbe.sa —
 * "استوديو الإبداع للتصوير") with REAL images and a set of public services,
 * so the public marketplace vendor page renders a realistic example.
 *
 * - Images are hot-linkable Unsplash URLs. `signStoredImage` passes external
 *   https URLs through unchanged, and `images.unsplash.com` is whitelisted in
 *   the web app's next.config, so next/image renders them directly.
 * - Scoped strictly to the one demo vendor: it updates that user's vendorData
 *   image/about/social fields and REPLACES that vendor's services. Nothing else
 *   in the (shared) database is touched.
 *
 * Usage: node scripts/seedVendorShowcase.js
 */

const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", "config.env") });

const User = require("../models/UserModel");
const Service = require("../models/ServiceModel");

const VENDOR_EMAIL = "test.vendor@labbe.sa";

// Unsplash photo IDs verified to return 200. Sized + cropped for nice rendering.
const img = (id, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const LOGO = img("1452587925148-ce544e77e70d", 400); // camera / studio mark
const PORTFOLIO = [
  img("1519741497674-611481863552"), // [0] wedding couple — used as hero banner
  img("1511795409834-ef04bbd61622"), // party / event
  img("1606800052052-a08af7148866"), // wedding decor
  img("1519225421980-715cb0215aed"), // wedding hall
  img("1464366400600-7168b8af9bc3"), // concert lights
  img("1492684223066-81342ee5ff30"), // confetti celebration
  img("1464047736614-af63643285bf"), // wedding reception
  img("1511578314322-379afb476865"), // event stage
];

// Document / pricing imagery (the dashboard renders these via next/image, so
// they must be IMAGE urls, not PDFs).
const NATIONAL_ID_IMAGE = img("1606857521015-7f9fcf423740", 800); // "License" (otherLicenses → nationalIdImage)
const COMMERCIAL_RECORD_IMAGE = img("1586281380349-632531db7ed4", 800); // Commercial Record
const PROFILE_FILE = img("1517842645767-c639042777db", 800); // company profile document
const PRICE_PACKAGES = [
  img("1554224155-6726b3ff858f", 900), // price list / packages
  img("1454165804606-c3d57bc86b40", 900), // packages overview
];

const RIYADH = {
  regionId: 1,
  regionNameAr: "منطقة الرياض",
  regionNameEn: "Riyadh Region",
  cityId: 1,
  cityNameAr: "الرياض",
  cityNameEn: "Riyadh",
  districtIds: [],
  districtNames: [],
  coverageType: "city",
};

const services = [
  {
    name: "Wedding Photography Package",
    nameAr: "باقة تصوير الأفراح",
    description:
      "Full-day wedding coverage by two professional photographers, including ceremony, reception, and couple portraits. Delivered as a curated gallery of high-resolution edited photos.",
    descriptionAr:
      "تغطية كاملة ليوم الزفاف بواسطة مصوّرَين محترفين تشمل العقد والحفل وجلسة تصوير العروسين، وتُسلَّم كمعرض منسّق من الصور المعدّلة بدقة عالية.",
    category: "mediaProduction",
    image: img("1554080353-a576cf803bda"), // photographer
    price: 5000,
    currency: "SAR",
    duration: "8 hours",
    tags: ["wedding", "photography", "portraits"],
    included: ["Two photographers", "8 hours coverage", "500+ edited photos", "Online gallery"],
  },
  {
    name: "Cinematic Wedding Film",
    nameAr: "فيلم زفاف سينمائي",
    description:
      "A cinematic highlight film of your celebration, professionally shot and color-graded with licensed music, plus a short teaser for social media.",
    descriptionAr:
      "فيلم سينمائي لأبرز لحظات مناسبتك مصوّر باحتراف مع تدرّج لوني وموسيقى مرخّصة، بالإضافة إلى مقطع تشويقي قصير لوسائل التواصل.",
    category: "mediaProduction",
    image: img("1519671482749-fd09be7ccebf"), // videographer
    price: 7500,
    currency: "SAR",
    duration: "Full event",
    tags: ["videography", "cinematic", "film"],
    included: ["4K cinematic film", "Highlight reel", "Social teaser", "Licensed music"],
  },
  {
    name: "Drone Aerial Coverage",
    nameAr: "تغطية جوية بالدرون",
    description:
      "Stunning aerial photo and video coverage of your venue and event using a licensed drone operator for breathtaking establishing shots.",
    descriptionAr:
      "تغطية جوية مذهلة بالصور والفيديو لموقع مناسبتك بواسطة مشغّل درون مرخّص للحصول على لقطات افتتاحية آسرة.",
    category: "mediaProduction",
    image: img("1469371670807-013ccf25f16a"), // drone aerial
    price: 3500,
    currency: "SAR",
    duration: "3 hours",
    tags: ["drone", "aerial", "video"],
    included: ["Licensed drone pilot", "4K aerial video", "Aerial stills"],
  },
  {
    name: "Studio Portrait Session",
    nameAr: "جلسة تصوير استوديو",
    description:
      "A guided studio portrait session with professional lighting, multiple backdrops, and retouched final images — ideal for families and individuals.",
    descriptionAr:
      "جلسة تصوير بورتريه موجّهة داخل الاستوديو بإضاءة احترافية وخلفيات متعددة وصور نهائية معدّلة — مثالية للعائلات والأفراد.",
    category: "mediaProduction",
    image: img("1583939003579-730e3918a45a"), // portrait studio
    price: 1200,
    currency: "SAR",
    duration: "90 minutes",
    tags: ["portrait", "studio", "family"],
    included: ["Studio time", "Professional lighting", "20 retouched photos"],
  },
  {
    name: "Full Event Coordination",
    nameAr: "تنسيق فعاليات متكامل",
    description:
      "End-to-end planning and on-the-day coordination for your occasion — vendor management, run-of-show, and a dedicated coordinator to keep everything on track.",
    descriptionAr:
      "تخطيط متكامل وتنسيق في يوم المناسبة — إدارة المورّدين وجدول سير الحفل ومنسّق مخصّص لضمان سير كل شيء بسلاسة.",
    category: "eventPlanning",
    image: img("1470229722913-7c0e2dbbafd3"), // crowd / event
    price: 9000,
    currency: "SAR",
    duration: "Full event",
    tags: ["coordination", "planning", "events"],
    included: ["Dedicated coordinator", "Vendor management", "Run-of-show", "On-site team"],
  },
  {
    name: "Birthday & Celebration Setup",
    nameAr: "تجهيز حفلات أعياد الميلاد",
    description:
      "Themed décor, balloons, and styling for birthdays and private celebrations, fully set up and dismantled by our team.",
    descriptionAr:
      "ديكور بثيمات وبالونات وتنسيق لحفلات أعياد الميلاد والمناسبات الخاصة، مع التركيب والفك بالكامل بواسطة فريقنا.",
    category: "eventPlanning",
    image: img("1530103862676-de8c9debad1d"), // birthday / cake
    price: 2500,
    currency: "SAR",
    duration: "Half day",
    tags: ["birthday", "decor", "celebration"],
    included: ["Themed décor", "Balloon styling", "Setup & teardown"],
  },
];

async function run() {
  let DB = process.env.DATABASE;
  if (!DB) {
    console.error("❌ DATABASE env var is not set (config.env).");
    process.exit(1);
  }
  if (process.env.DATABASE_PASSWORD && DB.includes("<PASSWORD>")) {
    DB = DB.replace("<PASSWORD>", process.env.DATABASE_PASSWORD);
  }
  const mongoOptions = {};
  if (process.env.DATABASE_CERT_PATH) {
    mongoOptions.tls = true;
    mongoOptions.tlsCertificateKeyFile = process.env.DATABASE_CERT_PATH;
  }

  await mongoose.connect(DB, mongoOptions);
  console.log("✅ Connected to database");

  const vendor = await User.findOne({ email: VENDOR_EMAIL }).select("_id email role profile.vendorData.brandName");
  if (!vendor) {
    console.error(`❌ Vendor ${VENDOR_EMAIL} not found. Run scripts/seedTestUsers.js first.`);
    process.exit(1);
  }
  console.log(`📌 Vendor: ${vendor.profile?.vendorData?.brandName || "(no brand)"}  id=${vendor._id}`);

  // 1. Update vendor profile imagery / copy / socials (scoped to this vendor).
  await User.updateOne(
    { _id: vendor._id },
    {
      $set: {
        "profile.vendorData.businessLogo": LOGO,
        "profile.vendorData.portfolioImages": PORTFOLIO,
        "profile.vendorData.nationalIdImage": NATIONAL_ID_IMAGE,
        "profile.vendorData.commercialRecordImage": COMMERCIAL_RECORD_IMAGE,
        "profile.vendorData.profileFile": PROFILE_FILE,
        "profile.vendorData.pricePackages": PRICE_PACKAGES,
        "profile.vendorData.taglineAr": "نحوّل لحظاتكم إلى ذكريات خالدة",
        "profile.vendorData.taglineEn": "Turning your moments into timeless memories",
        "profile.vendorData.aboutAr":
          "استوديو الإبداع للتصوير فريق متخصص في توثيق المناسبات والأفراح في الرياض منذ أكثر من عشر سنوات. نجمع بين الرؤية الفنية وأحدث المعدات لنقدّم صورًا وأفلامًا تحكي قصتكم بأجمل صورة، مع باقات مرنة تناسب كل مناسبة.",
        "profile.vendorData.aboutEn":
          "Creative Studio is a Riyadh-based team specialising in capturing weddings and events for over a decade. We blend artistic vision with the latest equipment to deliver photos and films that tell your story beautifully, with flexible packages for every occasion.",
        "profile.vendorData.socialLinks": {
          instagram: "https://instagram.com/creative_studio_sa",
          facebook: "https://facebook.com/creativestudiosa",
          tiktok: "https://tiktok.com/@creative_studio_sa",
          twitter: "https://twitter.com/creative_studio",
          website: "https://creativestudio.sa",
          whatsapp: "966523456789",
        },
      },
    }
  );
  console.log("✅ Updated vendor profile (logo, portfolio, about, socials, license, commercial record, price packages)");

  // 2. Replace this vendor's services with the showcase set (real images, public).
  const del = await Service.deleteMany({ vendorId: vendor._id });
  console.log(`🧹 Removed ${del.deletedCount} existing service(s) for this vendor`);

  const docs = services.map((s) => ({
    ...s,
    vendorId: vendor._id,
    status: "active",
    isPublic: true,
    serviceLocation: RIYADH,
  }));
  const created = await Service.insertMany(docs);
  console.log(`✅ Created ${created.length} public services with real images`);

  console.log("\n" + "=".repeat(60));
  console.log("🎉 Vendor showcase ready");
  console.log("=".repeat(60));
  console.log(`Vendor id : ${vendor._id}`);
  console.log(`EN page   : /en/market-place/vendors/${vendor._id}`);
  console.log(`AR page   : /ar/market-place/vendors/${vendor._id}`);
  console.log("=".repeat(60));

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Error seeding vendor showcase:", err);
  process.exit(1);
});
