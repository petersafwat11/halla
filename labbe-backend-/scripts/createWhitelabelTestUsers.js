/**
 * Script to create test whitelabel users
 * Creates a whitelabel_admin and whitelabel_moderator for the same tenant
 *
 * Usage: node scripts/createWhitelabelTestUsers.js
 */

require("dotenv").config({ path: "./config.env" });
const mongoose = require("mongoose");

const MONGODB_URI = process.env.DATABASE
  ? process.env.DATABASE.replace("<PASSWORD>", process.env.DATABASE_PASSWORD)
  : "mongodb://localhost:27017/labbe";

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

const createTestUsers = async () => {
  const User = require("../models/UserModel");
  const Subscription = require("../models/SubscriptionModel");
  const Plan = require("../models/PlanModel");

  const password = "password123";

  await User.deleteMany({
    $or: [
      {
        email: {
          $in: [
            "whitelabel.admin.test@labbe.sa",
            "whitelabel.moderator.test@labbe.sa",
          ],
        },
      },
      {
        phoneNumber: { $in: ["+966599887766", "+966599887767"] },
      },
    ],
  });
  console.log("🗑️  Cleaned up existing test users");

  // Create the whitelabel admin first
  const whitelabelAdmin = new User({
    email: "whitelabel.admin.test@labbe.sa",
    phoneNumber: "+966599887766",
    username: "TestWhitelabelAdmin",
    name: "مدير منصة اختبار",
    password: password,
    emailVerified: true,
    role: "whitelabel_admin",
    status: "active",
    profile: {
      whitelabelData: {
        arabicName: "منصة الاختبار للمناسبات",
        englishName: "Test Events Platform",
        platformName: "Test Events",
        companyName: "شركة الاختبار للتقنية",
        logo: "https://example.com/test-logo.png",
        favicon: "https://example.com/test-favicon.ico",
        requirements: {
          numberOfEventsMonthly: 10,
          numberOfGuestsMonthly: 500,
          eventTypes: ["wedding", "corporate", "birthday"],
        },
        address: {
          city: "الرياض",
          neighborhood: "العليا",
          street: "شارع الملك فهد",
          buildingNumber: "123",
        },
        licenseNumber: "1234567890",
        taxNumber: "300987654321012",
        planSelection: {
          planCode: "business_quarterly",
        },
        applicationStatus: "approved",
      },
    },
    permissions: ["manage_hosts", "manage_events", "manage_payments", "manage_team"],
    loginCount: 0,
  });

  await whitelabelAdmin.save();
  whitelabelAdmin.whitelabelId = whitelabelAdmin._id;
  await whitelabelAdmin.save();

  console.log("✅ Created whitelabel admin:", whitelabelAdmin.email);
  console.log("   ID:", whitelabelAdmin._id);
  console.log("   WhitelabelId (Tenant ID):", whitelabelAdmin.whitelabelId);

  // Create business_quarterly subscription for the whitelabel admin
  try {
    const plan = await Plan.findOne({ code: "business_quarterly" });
    if (!plan) {
      console.log("   ⚠️  'business_quarterly' plan not found — run seedPlans.js first");
    } else {
      const subscription = await Subscription.createForUser(
        whitelabelAdmin._id,
        plan,
        {
          status: "active",
          pricePaid: plan.pricing?.oneTime || 3500,
          currency: "SAR",
          whitelabelId: whitelabelAdmin._id,
        }
      );
      whitelabelAdmin.subscription = subscription._id;
      await whitelabelAdmin.save({ validateBeforeSave: false });
      console.log("   Subscription created:", subscription._id);
      console.log("   invitePool: 500  compensationPool: 75  durationDays: 90");
    }
  } catch (subError) {
    console.log("   ⚠️  Could not create subscription:", subError.message);
  }

  // Create the whitelabel moderator (same tenant)
  const whitelabelModerator = new User({
    email: "whitelabel.moderator.test@labbe.sa",
    phoneNumber: "+966599887767",
    username: "TestWhitelabelModerator",
    name: "مشرف منصة اختبار",
    password: password,
    emailVerified: true,
    role: "whitelabel_moderator",
    status: "active",
    whitelabelId: whitelabelAdmin._id,
    profile: {
      adminData: {
        title: "مشرف",
        department: "خدمة العملاء",
      },
    },
    permissions: ["manage_hosts", "manage_events"],
    loginCount: 0,
  });

  await whitelabelModerator.save();

  console.log("\n✅ Created whitelabel moderator:", whitelabelModerator.email);
  console.log("   ID:", whitelabelModerator._id);
  console.log("   WhitelabelId (Tenant ID):", whitelabelModerator.whitelabelId);

  console.log("\n" + "=".repeat(60));
  console.log("TEST USERS CREATED SUCCESSFULLY!");
  console.log("=".repeat(60));
  console.log("\n📋 Login Credentials:\n");
  console.log("1. Whitelabel Admin:");
  console.log("   Email:    whitelabel.admin.test@labbe.sa");
  console.log("   Password: password123");
  console.log("   Role:     whitelabel_admin");
  console.log("   Plan:     business_quarterly (invitePool: 500, 90 days)");
  console.log("   Tenant ID:", whitelabelAdmin._id.toString());
  console.log("\n2. Whitelabel Moderator:");
  console.log("   Email:    whitelabel.moderator.test@labbe.sa");
  console.log("   Password: password123");
  console.log("   Role:     whitelabel_moderator");
  console.log("   Tenant ID:", whitelabelAdmin._id.toString(), "(same as admin)");
  console.log("\n" + "=".repeat(60));
};

const main = async () => {
  await connectDB();
  try {
    await createTestUsers();
  } catch (error) {
    console.error("❌ Error creating test users:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Disconnected from MongoDB");
    process.exit(0);
  }
};

main();
