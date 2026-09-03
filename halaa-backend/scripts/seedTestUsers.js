/**
 * Seed Test Users Script
 * Creates complete test users for all user types with realistic data
 *
 * Users created:
 * 1. Host - with trial subscription, complete profile
 * 2. Vendor - accepted status, complete business data
 * 3. Super Admin - full access (unlimited plan)
 * 4. Admin - platform admin (unlimited plan)
 * 5. Moderator - support role (unlimited plan)
 *
 * All users have password: password123
 *
 * Usage: node scripts/seedTestUsers.js
 */

const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", "config.env") });

const User = require("../models/UserModel");
const Plan = require("../models/PlanModel");
const Subscription = require("../models/SubscriptionModel");
const { ROLES, USER_STATUS, VENDOR_STATUS, SUBSCRIPTION_STATUS, ACCOUNT_TYPES } = require("../src/shared/constants");

const TEST_PASSWORD = "password123";

const testUsers = {
  host: {
    email: "test.host@labbe.sa",
    phoneNumber: "512345678",
    name: "محمد أحمد الحربي",
    password: TEST_PASSWORD,
    role: ROLES.HOST,
    accountType: ACCOUNT_TYPES.PERSONAL,
    status: USER_STATUS.ACTIVE,
    emailVerified: true,
    profile: {
      hostData: {
        profileCompleted: true,
        emailVerified: true,
        subscribedBefore: false,
        bio: "مضيف متميز في تنظيم المناسبات العائلية والاجتماعية",
        company: "شركة المناسبات الذهبية",
        position: "مدير المناسبات",
      },
    },
  },

  vendor: {
    email: "test.vendor@labbe.sa",
    phoneNumber: "523456789",
    name: "أحمد محمد السالم",
    password: TEST_PASSWORD,
    role: ROLES.VENDOR,
    status: USER_STATUS.ACTIVE,
    emailVerified: true,
    profile: {
      vendorData: {
        brandName: "استوديو الإبداع للتصوير",
        ownerFullName: "أحمد محمد السالم",
        serviceDescription:
          "نقدم خدمات التصوير الاحترافي للمناسبات والأفراح بأحدث المعدات وفريق متخصص.",
        serviceCategories: {
          mediaProduction: ["photography", "videography", "drone_coverage"],
          eventPlanning: ["event_coordination"],
        },
        serviceLocation: {
          regionId: 1,
          regionNameAr: "منطقة الرياض",
          regionNameEn: "Riyadh Region",
          cityId: 1,
          cityNameAr: "الرياض",
          cityNameEn: "Riyadh",
          districtIds: [],
          districtNames: [],
          coverageType: "city",
        },
        otherData: "نوفر باقات خاصة للمناسبات الكبيرة",
        portfolioImages: [
          "https://example.com/portfolio1.jpg",
          "https://example.com/portfolio2.jpg",
        ],
        businessLogo: "https://example.com/logo.png",
        profileFile: "https://example.com/profile.pdf",
        pricePackages: ["https://example.com/packages.pdf"],
        commercialRecordNumber: "1010123456",
        nationalId: "1098765432",
        commercialRecordImage: "https://example.com/cr.jpg",
        nationalIdImage: "https://example.com/id.jpg",
        socialLinks: {
          instagram: "https://instagram.com/creative_studio_sa",
          website: "https://creativestudio.sa",
        },
        rating: 4.8,
        numberOfRatings: 127,
        numberOfClicks: 2450,
        vendorStatus: VENDOR_STATUS.APPROVED,
        adminNotes: "Verified vendor with excellent service history",
      },
    },
  },

  superAdmin: {
    email: "test.superadmin@labbe.sa",
    phoneNumber: "545678901",
    name: "عبدالرحمن محمد القحطاني",
    password: TEST_PASSWORD,
    role: ROLES.SUPER_ADMIN,
    status: USER_STATUS.ACTIVE,
    emailVerified: true,
    profile: {
      adminData: {
        title: "مدير النظام الرئيسي",
        department: "الإدارة التقنية",
        lastLogin: new Date(),
        loginAttempts: 0,
        actionsCount: 0,
      },
    },
  },

  admin: {
    email: "test.admin@labbe.sa",
    phoneNumber: "556789012",
    name: "سعد إبراهيم الدوسري",
    password: TEST_PASSWORD,
    role: ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
    emailVerified: true,
    profile: {
      adminData: {
        title: "مدير المنصة",
        department: "إدارة العمليات",
        lastLogin: new Date(),
        loginAttempts: 0,
        actionsCount: 0,
      },
    },
  },

  moderator: {
    email: "test.moderator@labbe.sa",
    phoneNumber: "567890123",
    name: "فهد عبدالله المالكي",
    password: TEST_PASSWORD,
    role: ROLES.MODERATOR,
    status: USER_STATUS.ACTIVE,
    emailVerified: true,
    profile: {
      adminData: {
        title: "مشرف الدعم الفني",
        department: "خدمة العملاء",
        lastLogin: new Date(),
        loginAttempts: 0,
        actionsCount: 0,
      },
    },
  },

};

const seedTestUsers = async () => {
  try {
    let DB = process.env.DATABASE;
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

    // Fetch required plans
    const trialPlan = await Plan.findOne({ code: "trial" });
    const unlimitedPlan = await Plan.findOne({ code: "unlimited" });

    if (!trialPlan) {
      console.error("❌ 'trial' plan not found. Please run seedPlans.js first.");
      process.exit(1);
    }
    if (!unlimitedPlan) {
      console.error("❌ 'unlimited' plan not found. Please run seedPlans.js first.");
      process.exit(1);
    }

    console.log("\n🔄 Removing existing test users...");
    const testEmails = Object.values(testUsers).map((u) => u.email);
    const existingUsers = await User.find({ email: { $in: testEmails } }).select("_id");
    if (existingUsers.length > 0) {
      await Subscription.deleteMany({ userId: { $in: existingUsers.map((u) => u._id) } });
    }
    await User.deleteMany({ email: { $in: testEmails } });
    console.log("✅ Cleaned up existing test users");

    const createdUsers = {};

    // 1. Super Admin + unlimited subscription
    console.log("\n📝 Creating Super Admin...");
    createdUsers.superAdmin = await User.create(testUsers.superAdmin);
    const superAdminSub = await Subscription.createForUser(
      createdUsers.superAdmin._id,
      unlimitedPlan,
      { status: SUBSCRIPTION_STATUS.ACTIVE, pricePaid: 0, currency: "SAR" }
    );
    createdUsers.superAdmin.subscription = superAdminSub._id;
    await createdUsers.superAdmin.save({ validateBeforeSave: false });
    console.log(`   ✅ ${createdUsers.superAdmin.email} (Unlimited subscription)`);

    // 2. Admin + unlimited subscription.
    console.log("📝 Creating Admin...");
    createdUsers.admin = await User.create({
      ...testUsers.admin,
    });
    const adminSub = await Subscription.createForUser(
      createdUsers.admin._id,
      unlimitedPlan,
      { status: SUBSCRIPTION_STATUS.ACTIVE, pricePaid: 0, currency: "SAR" }
    );
    createdUsers.admin.subscription = adminSub._id;
    await createdUsers.admin.save({ validateBeforeSave: false });
    console.log(`   ✅ ${createdUsers.admin.email} (Unlimited subscription)`);

    // 3. Moderator + unlimited subscription.
    console.log("📝 Creating Moderator...");
    createdUsers.moderator = await User.create({
      ...testUsers.moderator,
    });
    const moderatorSub = await Subscription.createForUser(
      createdUsers.moderator._id,
      unlimitedPlan,
      { status: SUBSCRIPTION_STATUS.ACTIVE, pricePaid: 0, currency: "SAR" }
    );
    createdUsers.moderator.subscription = moderatorSub._id;
    await createdUsers.moderator.save({ validateBeforeSave: false });
    console.log(`   ✅ ${createdUsers.moderator.email} (Unlimited subscription)`);

    // 4. Host + trial subscription
    console.log("📝 Creating Host...");
    createdUsers.host = await User.create(testUsers.host);
    const hostSub = await Subscription.createForUser(
      createdUsers.host._id,
      trialPlan,
      { status: SUBSCRIPTION_STATUS.TRIAL, pricePaid: 0, currency: "SAR" }
    );
    createdUsers.host.subscription = hostSub._id;
    await createdUsers.host.save({ validateBeforeSave: false });
    console.log(`   ✅ ${createdUsers.host.email} (Trial — 1 event, 5 invites)`);

    // 5. Vendor (no subscription needed)
    console.log("📝 Creating Vendor...");
    createdUsers.vendor = await User.create(testUsers.vendor);
    console.log(`   ✅ ${createdUsers.vendor.email}`);

    console.log("\n" + "=".repeat(70));
    console.log("🎉 TEST USERS CREATED SUCCESSFULLY!");
    console.log("=".repeat(70));
    console.log("\nAll users have password: password123\n");
    console.log("📋 User Summary:");
    console.log("-".repeat(70));
    console.log("  ROLE                  | EMAIL                          | PHONE");
    console.log("-".repeat(70));

    const userOrder = [
      { key: "superAdmin",          label: "Super Admin" },
      { key: "admin",               label: "Admin" },
      { key: "moderator",           label: "Moderator" },
      { key: "host",                label: "Host" },
      { key: "vendor",              label: "Vendor" },
    ];

    userOrder.forEach(({ key, label }) => {
      const user = createdUsers[key];
      console.log(`  ${label.padEnd(21)} | ${user.email.padEnd(30)} | ${user.phoneNumber}`);
    });

    console.log("-".repeat(70));
    console.log("\n📌 Subscription Notes:");
    console.log("   - Super Admin / Admin / Moderator: Unlimited (no expiry)");
    console.log("   - Host: Trial (1 event, 5 invites, 90 days)");
    console.log("   - Vendor: No subscription");
    console.log("=".repeat(70));

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding test users:", error);
    process.exit(1);
  }
};

seedTestUsers();
