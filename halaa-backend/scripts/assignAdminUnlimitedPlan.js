/**
 * Script: Assign Unlimited Plan to Platform Admins
 *
 * Creates or assigns the UNLIMITED plan to platform admins
 * (super_admin, admin, moderator)
 *
 * Usage: node scripts/assignAdminUnlimitedPlan.js
 */

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../config.env") });

const User = require("../models/UserModel");
const Plan = require("../models/PlanModel");
const Subscription = require("../models/SubscriptionModel");
const { ROLES, PLAN_CODES, PLAN_DEFAULTS, SUBSCRIPTION_STATUS } = require("../src/shared/constants");

const MONGODB_URI = process.env.DATABASE
  ? process.env.DATABASE.replace("<PASSWORD>", process.env.DATABASE_PASSWORD)
  : "mongodb://localhost:27017/labbe";

async function assignUnlimitedPlan() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Step 1: Create or find the UNLIMITED plan
    console.log("\n--- Step 1: Creating/Finding UNLIMITED Plan ---");
    let unlimitedPlan = await Plan.findOne({ code: PLAN_CODES.UNLIMITED });

    if (!unlimitedPlan) {
      const planConfig = PLAN_DEFAULTS[PLAN_CODES.UNLIMITED];
      unlimitedPlan = await Plan.create({
        code: PLAN_CODES.UNLIMITED,
        nameAr: planConfig.nameAr,
        nameEn: planConfig.nameEn,
        planType: planConfig.planType,
        planFamily: planConfig.planFamily,
        billingType: planConfig.billingType,
        availableFor: planConfig.availableFor,
        pricing: planConfig.pricing,
        currency: planConfig.currency,
        limits: planConfig.limits,
        features: planConfig.features,
        isActive: true,
        isPublic: false,
      });
      console.log(`Created UNLIMITED plan with ID: ${unlimitedPlan._id}`);
    } else {
      console.log(`Found existing UNLIMITED plan with ID: ${unlimitedPlan._id}`);
    }

    // Step 2: Find all platform admins
    console.log("\n--- Step 2: Finding Platform Admins ---");
    const platformAdminRoles = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MODERATOR];
    const platformAdmins = await User.find({
      role: { $in: platformAdminRoles },
    });

    console.log(`Found ${platformAdmins.length} platform admins`);

    // Step 3: Assign unlimited subscription to each admin
    console.log("\n--- Step 3: Assigning Unlimited Subscriptions ---");
    let created = 0;
    let existing = 0;
    let errors = 0;

    for (const admin of platformAdmins) {
      try {
        const existingSub = await Subscription.findOne({
          userId: admin._id,
          status: { $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL] },
        }).populate("planId");

        if (existingSub) {
          if (existingSub.planId?.code === PLAN_CODES.UNLIMITED) {
            console.log(`Admin ${admin.username || admin._id} already has unlimited plan`);
            existing++;
            continue;
          }

          // Upgrade existing subscription to unlimited in-place
          existingSub.planId = unlimitedPlan._id;
          existingSub.invitePool = null;
          existingSub.compensationPool = null;
          existingSub.expiresAt = null;
          await existingSub.save();
          console.log(`Updated subscription for admin ${admin.username || admin._id}`);
          created++;
        } else {
          // Create new unlimited subscription via createForUser
          const subscription = await Subscription.createForUser(
            admin._id,
            unlimitedPlan,
            { status: SUBSCRIPTION_STATUS.ACTIVE, pricePaid: 0, currency: "SAR" }
          );

          await User.findByIdAndUpdate(admin._id, { subscription: subscription._id });
          console.log(`Created unlimited subscription for admin ${admin.username || admin._id}`);
          created++;
        }
      } catch (err) {
        console.error(`Error processing admin ${admin.username || admin._id}:`, err.message);
        errors++;
      }
    }

    console.log("\n--- Script Complete ---");
    console.log(`Total platform admins: ${platformAdmins.length}`);
    console.log(`Created/Updated:       ${created}`);
    console.log(`Already unlimited:     ${existing}`);
    console.log(`Errors:                ${errors}`);
  } catch (error) {
    console.error("Script failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
}

assignUnlimitedPlan();
