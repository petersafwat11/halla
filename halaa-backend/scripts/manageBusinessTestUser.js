const { connectDB, disconnectDB } = require("../src/config/database");
const User = require("../models/UserModel");
const Plan = require("../models/PlanModel");
const Subscription = require("../models/SubscriptionModel");
const { ROLES, USER_STATUS, SUBSCRIPTION_STATUS, ACCOUNT_TYPES } = require("../src/shared/constants");

async function main() {
  await connectDB();

  const businessEmail = "test.business@labbe.sa";
  const password = "password123";

  let user = await User.findOne({ email: businessEmail }).select("+password");

  if (!user) {
    console.log(`Creating new business test user: ${businessEmail}`);
    user = await User.create({
      email: businessEmail,
      phoneNumber: "534567890",
      name: "حساب الأعمال التجريبي / Business Host",
      password: password,
      role: ROLES.HOST,
      accountType: ACCOUNT_TYPES.BUSINESS,
      status: USER_STATUS.ACTIVE,
      emailVerified: true,
      preferredLanguage: "ar",
      profile: {
        hostData: {
          profileCompleted: true,
          emailVerified: true,
          subscribedBefore: true,
          bio: "حساب أعمال تجريبي لمراجعة متجر التطبيقات / Demo business host for store review",
          company: "شركة المناسبات المؤسسية",
          position: "مسؤول الفعاليات",
        },
        businessData: {
          description: "Demo business account for store review (self-serve business plans).",
        },
      },
    });
  } else {
    console.log(`Updating existing business test user: ${businessEmail}`);
    user.accountType = ACCOUNT_TYPES.BUSINESS;
    user.role = ROLES.HOST;
    user.status = USER_STATUS.ACTIVE;
    user.emailVerified = true;
    user.password = password;
    await user.save({ validateBeforeSave: false });
  }

  // Ensure active business subscription (business_quarterly)
  let sub = await Subscription.findOne({
    userId: user._id,
    status: SUBSCRIPTION_STATUS.ACTIVE,
  });

  if (!sub) {
    const plan = await Plan.findOne({ code: "business_quarterly" });
    if (plan) {
      sub = await Subscription.createForUser(user._id, plan, {
        status: SUBSCRIPTION_STATUS.ACTIVE,
        pricePaid: 0,
        currency: "SAR",
      });
      user.subscription = sub._id;
      await user.save({ validateBeforeSave: false });
      console.log("Attached active business_quarterly subscription.");
    } else {
      console.warn("Plan business_quarterly not found in plans collection.");
    }
  }

  // Test password verification
  const isMatch = await user.comparePassword(password);
  console.log(`Smoke login check for ${businessEmail}: ${isMatch ? "SUCCESS ✅" : "FAILED ❌"}`);

  console.log("\n==========================================");
  console.log("🎉 Business Test Account Ready:");
  console.log(`Email: ${businessEmail}`);
  console.log(`Password: ${password}`);
  console.log(`Role: HOST (Business)`);
  console.log("==========================================");

  await disconnectDB();
}

main().catch(console.error);
