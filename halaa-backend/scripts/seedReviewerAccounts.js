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
 *   REVIEWER_BUSINESS_EMAIL=review.business@halaa.com.sa \
 *   REVIEWER_BUSINESS_PASSWORD='<strong-password>' \
 *   [REVIEWER_HOST_PLAN=premium_monthly_100] \
 *   [REVIEWER_BUSINESS_PLAN=business_quarterly] \
 *   node scripts/seedReviewerAccounts.js
 *
 * Rotate the passwords after each review cycle (re-run with new values). Put the
 * final credentials + role-by-role steps in Apple Review Information and Google
 * Play "App access". Do NOT add these accounts to any admin/moderator role.
 *
 * REVIEW-FINDINGS P1-01 fixes:
 *   - The default host plan is a VALID six-tier code (`premium_monthly_100`, an
 *     invite-tier suffix is required — bare `premium_monthly` does not exist).
 *   - NO silent `trial` fallback: if the configured paid plan code is missing
 *     the script FAILS CLOSED (exit 1) instead of quietly granting a trial and
 *     contradicting the "paid features" review promise.
 *   - Seeds a BUSINESS-host reviewer (business self-serve is now reviewable —
 *     DEC-02) in addition to personal-host + vendor.
 *   - Runs a scripted SMOKE LOGIN (password compare) for every seeded account so
 *     a broken credential is caught at seed time, not by the store reviewer.
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
const BUSINESS_EMAIL =
  process.env.REVIEWER_BUSINESS_EMAIL || "review.business@halaa.com.sa";
const HOST_PASSWORD = process.env.REVIEWER_HOST_PASSWORD;
const VENDOR_PASSWORD = process.env.REVIEWER_VENDOR_PASSWORD;
const BUSINESS_PASSWORD = process.env.REVIEWER_BUSINESS_PASSWORD;
// VALID six-tier code (invite-tier suffix required). `premium_monthly` alone is
// NOT a real plan code — see plans.js PLAN_CODES.
const HOST_PLAN_CODE = process.env.REVIEWER_HOST_PLAN || "premium_monthly_100";
const BUSINESS_PLAN_CODE =
  process.env.REVIEWER_BUSINESS_PLAN || "business_quarterly";
// Clearly-fake placeholder KSA mobiles (login is email/password; phone unused).
const HOST_PHONE = process.env.REVIEWER_HOST_PHONE || "500000001";
const VENDOR_PHONE = process.env.REVIEWER_VENDOR_PHONE || "500000002";
const BUSINESS_PHONE = process.env.REVIEWER_BUSINESS_PHONE || "500000003";

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

/**
 * Ensure `user` has an ACTIVE subscription on the EXACT paid plan `planCode`.
 * FAILS CLOSED (throws) if that plan code does not exist — NO silent trial
 * fallback (P1-01). The reviewer must see the promised paid features, so a
 * missing catalog entry is a hard error the operator must fix (reseed plans /
 * pass a valid code), not something we paper over with a free trial.
 */
async function ensurePaidEntitlement(user, planCode) {
  const active = await Subscription.findOne({
    userId: user._id,
    status: { $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL] },
  });
  if (active) return active;

  const plan = await Plan.findOne({ code: planCode });
  if (!plan) {
    throw new Error(
      `Reviewer plan code '${planCode}' not found in the catalog. ` +
        `Refusing to fall back to 'trial' (that would contradict the paid-feature ` +
        `review promise — P1-01). Pass a valid six-tier code via env and/or run ` +
        `seedPlans.js first. Valid examples: premium_monthly_100, basic_monthly_100, ` +
        `business_quarterly.`
    );
  }
  const sub = await Subscription.createForUser(user._id, plan, {
    status: SUBSCRIPTION_STATUS.ACTIVE,
    pricePaid: 0,
    currency: "SAR",
  });
  user.subscription = sub._id;
  await user.save({ validateBeforeSave: false });
  return sub;
}

const businessSpec = {
  email: BUSINESS_EMAIL,
  phoneNumber: BUSINESS_PHONE,
  name: "Reviewer Business Host / حساب أعمال للمراجعة",
  role: ROLES.HOST,
  accountType: ACCOUNT_TYPES.BUSINESS,
  status: USER_STATUS.ACTIVE,
  emailVerified: true,
  preferredLanguage: "en",
  profile: {
    hostData: {
      profileCompleted: true,
      emailVerified: true,
      subscribedBefore: true,
      bio: "App review demo BUSINESS host / حساب أعمال تجريبي لمراجعة المتجر",
    },
    businessData: {
      description:
        "Demo business account for store review (self-serve business plans). / حساب أعمال تجريبي لمراجعة المتجر.",
    },
  },
};

/**
 * Scripted smoke login: verify the seeded account can authenticate with the
 * password we just set (password compare only — no OTP/MFA/onboarding). Catches
 * a broken credential at seed time rather than in the store reviewer's hands.
 */
async function smokeLogin(email, password) {
  const u = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!u) throw new Error(`smoke login: user ${email} not found after seed`);
  const ok =
    typeof u.comparePassword === "function" && (await u.comparePassword(password));
  if (!ok) throw new Error(`smoke login FAILED for ${email} (password mismatch)`);
  if (u.status !== USER_STATUS.ACTIVE) {
    throw new Error(`smoke login: ${email} is not ACTIVE (status=${u.status})`);
  }
  return true;
}

async function run() {
  if (!HOST_PASSWORD || !VENDOR_PASSWORD || !BUSINESS_PASSWORD) {
    console.error(
      "❌ REVIEWER_HOST_PASSWORD, REVIEWER_VENDOR_PASSWORD and REVIEWER_BUSINESS_PASSWORD " +
        "are required (set them in the environment). Refusing to seed with a default password."
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
  const sub = await ensurePaidEntitlement(host.user, HOST_PLAN_CODE);
  console.log(
    `✅ Personal host ${host.created ? "created" : "updated"}: ${host.user.email} ` +
      `(plan: ${HOST_PLAN_CODE}, entitlement: ${sub.status})`
  );

  const business = await upsertUser(businessSpec, BUSINESS_PASSWORD);
  const bizSub = await ensurePaidEntitlement(business.user, BUSINESS_PLAN_CODE);
  console.log(
    `✅ Business host ${business.created ? "created" : "updated"}: ${business.user.email} ` +
      `(plan: ${BUSINESS_PLAN_CODE}, entitlement: ${bizSub.status})`
  );

  const vendor = await upsertUser(vendorSpec, VENDOR_PASSWORD);
  console.log(
    `✅ Vendor ${vendor.created ? "created" : "updated"}: ${vendor.user.email} (vendorStatus: approved)`
  );

  // Pre-accept current Terms/Community Rules so the reviewer isn't blocked by
  // the UGC terms gate (they can still demonstrate the acceptance UI on a fresh
  // signup). §6.
  await moderationService.acceptPolicies("user", host.user._id, { locale: "en" });
  await moderationService.acceptPolicies("user", business.user._id, { locale: "en" });
  await moderationService.acceptPolicies("user", vendor.user._id, { locale: "en" });
  console.log("✅ Pre-accepted UGC terms for reviewer host + business + vendor");

  // Scripted smoke login (P1-01): fail the seed if any credential is broken.
  await smokeLogin(host.user.email, HOST_PASSWORD);
  await smokeLogin(business.user.email, BUSINESS_PASSWORD);
  await smokeLogin(vendor.user.email, VENDOR_PASSWORD);
  console.log("✅ Smoke login passed for host + business + vendor (email/password, no OTP)");

  console.log("\n" + "=".repeat(64));
  console.log("🎉 Reviewer accounts ready (email/password login, no OTP)");
  console.log("=".repeat(64));
  console.log(`PERSONAL HOST : ${host.user.email}  (plan ${HOST_PLAN_CODE})`);
  console.log(`BUSINESS HOST : ${business.user.email}  (plan ${BUSINESS_PLAN_CODE})`);
  console.log(`VENDOR        : ${vendor.user.email}`);
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
