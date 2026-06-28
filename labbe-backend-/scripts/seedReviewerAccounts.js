/**
 * Seed App Store / Google Play REVIEWER accounts (SHIP §5.2 / decision D7).
 *
 * Creates two dedicated, NON-privileged reviewer accounts that sign in with
 * email/password only — no SMS OTP, no email delivery, no MFA, no CAPTCHA, no
 * one-time onboarding gate — so a store reviewer can sign in and exercise the
 * app immediately:
 *
 *   1. HOST   (role=host, accountType=personal) + an ACTIVE entitlement so the
 *             reviewer can create/send events and see paid host features.
 *   2. VENDOR (role=vendor, vendorStatus=approved) with AR/EN sample profile
 *             so the marketplace/vendor surfaces render.
 *
 * No real customer PII is used. Idempotent: safe to re-run — it upserts by
 * email, resets the password, and ensures the host entitlement exists.
 *
 * SECURITY: passwords are NOT defaulted. You MUST provide them via env so no
 * known credential is ever committed or shipped:
 *
 *   REVIEWER_HOST_EMAIL=review.host@halaa.com.sa \
 *   REVIEWER_HOST_PASSWORD='<strong-password>' \
 *   REVIEWER_VENDOR_EMAIL=review.vendor@halaa.com.sa \
 *   REVIEWER_VENDOR_PASSWORD='<strong-password>' \
 *   [REVIEWER_HOST_PLAN=premium_monthly] \
 *   node scripts/seedReviewerAccounts.js
 *
 * Rotate the passwords after each review cycle (re-run with new values). Put the
 * final credentials + role-by-role steps in Apple Review Information and Google
 * Play "App access". Do NOT add these accounts to any admin/moderator role.
 */

const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", "config.env") });

const User = require("../models/UserModel");
const Plan = require("../models/PlanModel");
const Subscription = require("../models/SubscriptionModel");
const {
  ROLES,
  USER_STATUS,
  VENDOR_STATUS,
  SUBSCRIPTION_STATUS,
  ACCOUNT_TYPES,
} = require("../src/shared/constants");
const moderationService = require("../src/modules/moderation/moderation.service");

// ── Config from env (passwords are required, never defaulted) ──────────────
const HOST_EMAIL = process.env.REVIEWER_HOST_EMAIL || "review.host@halaa.com.sa";
const VENDOR_EMAIL =
  process.env.REVIEWER_VENDOR_EMAIL || "review.vendor@halaa.com.sa";
const HOST_PASSWORD = process.env.REVIEWER_HOST_PASSWORD;
const VENDOR_PASSWORD = process.env.REVIEWER_VENDOR_PASSWORD;
const HOST_PLAN_CODE = process.env.REVIEWER_HOST_PLAN || "premium_monthly";
// Clearly-fake placeholder KSA mobiles (login is email/password; phone unused).
const HOST_PHONE = process.env.REVIEWER_HOST_PHONE || "500000001";
const VENDOR_PHONE = process.env.REVIEWER_VENDOR_PHONE || "500000002";

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

const hostSpec = {
  email: HOST_EMAIL,
  phoneNumber: HOST_PHONE,
  username: "ReviewerHost",
  name: "Reviewer Host / حساب المراجعة",
  role: ROLES.HOST,
  accountType: ACCOUNT_TYPES.PERSONAL,
  status: USER_STATUS.ACTIVE,
  emailVerified: true,
  preferredLanguage: "en",
  profile: {
    hostData: {
      profileCompleted: true,
      emailVerified: true,
      subscribedBefore: true,
      bio: "App review demo host account / حساب مضيف تجريبي لمراجعة المتجر",
    },
  },
};

const vendorSpec = {
  email: VENDOR_EMAIL,
  phoneNumber: VENDOR_PHONE,
  username: "ReviewerVendor",
  name: "Reviewer Vendor / مورد المراجعة",
  role: ROLES.VENDOR,
  status: USER_STATUS.ACTIVE,
  emailVerified: true,
  preferredLanguage: "en",
  profile: {
    vendorData: {
      brandName: "Halaa Review Studio / استوديو هلا للمراجعة",
      ownerFullName: "Reviewer Vendor",
      serviceDescription:
        "Demo vendor profile for app store review. / ملف مورد تجريبي لمراجعة المتجر.",
      taglineAr: "حساب تجريبي لمراجعة التطبيق",
      taglineEn: "Demo account for app review",
      aboutAr:
        "هذا حساب مورد تجريبي مخصّص لمراجعي المتجر لاستعراض صفحات المورد والخدمات. لا يحتوي على بيانات عملاء حقيقية.",
      aboutEn:
        "This is a demo vendor account for store reviewers to browse vendor and service pages. It contains no real customer data.",
      serviceCategories: {
        mediaProduction: ["photography", "videography"],
        eventPlanning: ["event_coordination"],
      },
      serviceLocation: RIYADH,
      portfolioImages: [],
      socialLinks: { website: "https://halaa.com.sa" },
      vendorStatus: VENDOR_STATUS.APPROVED,
      adminNotes: "App-store reviewer demo vendor (seeded).",
    },
  },
};

async function upsertUser(spec, password) {
  let user = await User.findOne({ email: spec.email.toLowerCase() });
  if (user) {
    // Re-apply the review-friendly state + reset password (pre-save hook hashes).
    Object.assign(user, spec, { email: spec.email.toLowerCase() });
    user.password = password;
    user.lockUntil = undefined;
    user.loginAttempts = 0;
    await user.save({ validateBeforeSave: false });
    return { user, created: false };
  }
  user = await User.create({
    ...spec,
    email: spec.email.toLowerCase(),
    password,
  });
  return { user, created: true };
}

async function ensureHostEntitlement(hostUser) {
  const active = await Subscription.findOne({
    userId: hostUser._id,
    status: { $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL] },
  });
  if (active) return active;

  let plan =
    (await Plan.findOne({ code: HOST_PLAN_CODE })) ||
    (await Plan.findOne({ code: "trial" }));
  if (!plan) {
    throw new Error(
      `No plan found for '${HOST_PLAN_CODE}' or 'trial'. Run seedPlans.js first.`
    );
  }
  const sub = await Subscription.createForUser(hostUser._id, plan, {
    status: SUBSCRIPTION_STATUS.ACTIVE,
    pricePaid: 0,
    currency: "SAR",
  });
  hostUser.subscription = sub._id;
  await hostUser.save({ validateBeforeSave: false });
  return sub;
}

async function run() {
  if (!HOST_PASSWORD || !VENDOR_PASSWORD) {
    console.error(
      "❌ REVIEWER_HOST_PASSWORD and REVIEWER_VENDOR_PASSWORD are required (set them in the environment). " +
        "Refusing to seed with a default password."
    );
    process.exit(1);
  }

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

  const host = await upsertUser(hostSpec, HOST_PASSWORD);
  const sub = await ensureHostEntitlement(host.user);
  console.log(
    `✅ Host ${host.created ? "created" : "updated"}: ${host.user.email} (entitlement: ${sub.status})`
  );

  const vendor = await upsertUser(vendorSpec, VENDOR_PASSWORD);
  console.log(
    `✅ Vendor ${vendor.created ? "created" : "updated"}: ${vendor.user.email} (vendorStatus: approved)`
  );

  // Pre-accept current Terms/Community Rules so the reviewer isn't blocked by
  // the UGC terms gate (they can still demonstrate the acceptance UI on a fresh
  // signup). §6.
  await moderationService.acceptPolicies("user", host.user._id, { locale: "en" });
  await moderationService.acceptPolicies("user", vendor.user._id, { locale: "en" });
  console.log("✅ Pre-accepted UGC terms for reviewer host + vendor");

  console.log("\n" + "=".repeat(64));
  console.log("🎉 Reviewer accounts ready (email/password login, no OTP)");
  console.log("=".repeat(64));
  console.log(`HOST   : ${host.user.email}`);
  console.log(`VENDOR : ${vendor.user.email}`);
  console.log("Passwords: the values you passed via env (not printed).");
  console.log("Put these + role-by-role steps in Apple Review Info / Play App access.");
  console.log("=".repeat(64));

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Error seeding reviewer accounts:", err);
  process.exit(1);
});
