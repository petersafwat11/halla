/**
 * Batch activator for Google Play In-App Products and Subscription Base Plans.
 *
 * Usage:
 *   GOOGLE_SERVICE_ACCOUNT_PATH=../../halaa-mobile/play-service-account.json \
 *   GOOGLE_PACKAGE_NAME=com.halaa.app \
 *   node activateGoogleProducts.js [--dry-run]
 */

const { createGoogleAccessToken } = require("./auth/google");
const { requestJson } = require("./lib/http");
const { exportGoogle, readGoogleRegionsVersion } = require("./providers/google");

const BASE_URL = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications";

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const packageName = process.env.GOOGLE_PACKAGE_NAME || "com.halaa.app";
  console.log(`[Google Play Activator] Target package: ${packageName}`);
  console.log(`[Google Play Activator] Mode: ${isDryRun ? "DRY RUN" : "LIVE APPLY"}`);

  const token = await createGoogleAccessToken();
  const headers = { Authorization: `Bearer ${token}` };
  const packagePath = `${BASE_URL}/${encodeURIComponent(packageName)}`;

  let regionsVersion = null;
  try {
    const regResult = await readGoogleRegionsVersion();
    regionsVersion = regResult.regionsVersion;
    console.log(`[Google Play Activator] Current regions version: ${regionsVersion}`);
  } catch (err) {
    console.warn(`[Google Play Activator] Could not read regions version: ${err.message}`);
  }

  console.log("[Google Play Activator] Fetching current Google Play catalog export...");
  const exportData = await exportGoogle();
  const subscriptions = exportData.subscriptions || [];
  const oneTimeProducts = exportData.oneTimeProducts || [];

  console.log(
    `[Google Play Activator] Found ${subscriptions.length} subscriptions and ${oneTimeProducts.length} one-time products.`
  );

  let subBasePlansActivated = 0;
  let subBasePlansSkipped = 0;
  let oneTimeActivated = 0;
  let oneTimeSkipped = 0;

  // 1. Activate Subscription Base Plans
  for (const sub of subscriptions) {
    const productId = sub.productId;
    for (const basePlan of sub.basePlans || []) {
      const basePlanId = basePlan.basePlanId;
      const state = basePlan.state; // "DRAFT" | "ACTIVE" | "INACTIVE"
      if (state === "ACTIVE") {
        console.log(`  ✓ Subscription [${productId}] Base Plan [${basePlanId}] is already ACTIVE`);
        subBasePlansSkipped++;
        continue;
      }

      console.log(`  → Activating Subscription [${productId}] Base Plan [${basePlanId}] (current state: ${state})...`);
      if (!isDryRun) {
        const activateUrl = `${packagePath}/subscriptions/${encodeURIComponent(productId)}/basePlans/${encodeURIComponent(basePlanId)}:activate`;
        try {
          await requestJson(activateUrl, {
            method: "POST",
            headers,
            body: { basePlanId },
          });
          console.log(`    ✓ Activated successfully.`);
          subBasePlansActivated++;
        } catch (err) {
          console.error(`    ✗ Failed to activate: ${err.message}`);
        }
      } else {
        subBasePlansActivated++;
      }
    }
  }

  // 2. Activate One-Time Products Purchase Options.
  //
  // Purchase-option state is output-only on the OneTimeProduct resource. The
  // supported state transition is the dedicated batchUpdateStates endpoint;
  // patching `purchaseOptions.state` leaves the option in DRAFT (the exact
  // failure that previously kept RevenueCat offerings unavailable).
  const draftPurchaseOptions = [];
  for (const otp of oneTimeProducts) {
    const productId = otp.productId;
    const purchaseOptions = otp.purchaseOptions || [];
    for (const po of purchaseOptions) {
      if (po.state !== "ACTIVE") {
        draftPurchaseOptions.push({ productId, purchaseOptionId: po.purchaseOptionId });
      }
    }

    if (purchaseOptions.length > 0 && purchaseOptions.every((po) => po.state === "ACTIVE")) {
      console.log(`  ✓ One-Time Product [${productId}] purchase options are already ACTIVE`);
      oneTimeSkipped++;
    }
  }

  if (draftPurchaseOptions.length > 0) {
    for (const option of draftPurchaseOptions) {
      console.log(
        `  → Activating One-Time Product [${option.productId}] Purchase Option [${option.purchaseOptionId}]...`
      );
    }

    if (!isDryRun) {
      const updateStatesUrl = `${packagePath}/oneTimeProducts/-/purchaseOptions:batchUpdateStates`;
      await requestJson(updateStatesUrl, {
        method: "POST",
        headers,
        body: {
          requests: draftPurchaseOptions.map(({ productId, purchaseOptionId }) => ({
            activatePurchaseOptionRequest: {
              packageName,
              productId,
              purchaseOptionId,
            },
          })),
        },
      });
    }

    oneTimeActivated = draftPurchaseOptions.length;
  }

  console.log("\n==================================================");
  console.log("[Google Play Activator] SUMMARY:");
  console.log(`  Subscriptions Base Plans: ${subBasePlansActivated} activated, ${subBasePlansSkipped} already active`);
  console.log(`  One-Time Products: ${oneTimeActivated} activated, ${oneTimeSkipped} already active`);
  console.log("==================================================\n");
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`[Google Play Activator FATAL] ${err.stack || err.message}`);
    process.exit(1);
  });
}

module.exports = { main };
