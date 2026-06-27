/**
 * RevenueCat webhook — grants in-app-purchase entitlements.
 *
 * Apple/Google require native in-app billing for digital plans in the Saudi
 * storefront. The mobile app purchases via RevenueCat (StoreKit / Play
 * Billing); RevenueCat validates the receipt server-side and POSTs an event
 * here. We map the purchased product -> our plan code and grant the
 * subscription via the same lifecycle path used by admin assignment.
 *
 * Auth: RevenueCat sends a fixed `Authorization` header (configured in the
 * RevenueCat dashboard) which we compare against `REVENUECAT_WEBHOOK_AUTH`.
 * Mapping: `REVENUECAT_PRODUCT_PLAN_MAP` is a JSON string of
 * { "<rc_product_id>": "<plan_code>" }.
 *
 * The RevenueCat `app_user_id` is set to our user `_id` at SDK init
 * (services/purchases.js initPurchases), so it maps directly to the user.
 *
 * @module modules/payments/revenuecat.controller
 */

const crypto = require("crypto");
const catchAsync = require("../../shared/utils/catchAsync");
const logger = require("../../shared/utils/logger");
const { SUBSCRIPTION_STATUS } = require("../../shared/constants");
const subscriptionLifecycle = require("../subscriptions/subscriptionLifecycle.service");
const User = require("../../../models/UserModel");

// Event types that should grant/extend access.
const GRANT_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "NON_RENEWING_PURCHASE",
  "UNCANCELLATION",
]);

const parseProductPlanMap = () => {
  try {
    return JSON.parse(process.env.REVENUECAT_PRODUCT_PLAN_MAP || "{}");
  } catch (err) {
    logger.error("[revenuecat] REVENUECAT_PRODUCT_PLAN_MAP is not valid JSON", {
      error: err.message,
    });
    return {};
  }
};

const authOk = (req) => {
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
  if (!expected) {
    logger.error(
      "[revenuecat] REVENUECAT_WEBHOOK_AUTH not set — rejecting webhook. Set it (and the same value in the RevenueCat dashboard) to enable IAP grants."
    );
    return false;
  }
  const got = req.get("authorization") || "";
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

exports.webhook = catchAsync(async (req, res) => {
  if (!authOk(req)) {
    return res.status(401).json({ status: "error", message: "Unauthorized" });
  }

  const event = req.body?.event || {};
  const { type, app_user_id: appUserId, product_id: productId } = event;

  // Always 200 after auth so RevenueCat doesn't retry events we intentionally
  // skip (non-grant types, unmapped products, unknown users).
  if (!type || !appUserId) {
    return res.status(200).json({ status: "ignored", reason: "missing_fields" });
  }

  if (!GRANT_EVENTS.has(type)) {
    return res.status(200).json({ status: "ignored", reason: `event_${type}` });
  }

  const planCode = parseProductPlanMap()[productId];
  if (!planCode) {
    logger.warn("[revenuecat] no plan mapping for product", { productId, type });
    return res.status(200).json({ status: "ignored", reason: "unmapped_product" });
  }

  const user = await User.findById(appUserId).select("role");
  if (!user) {
    logger.warn("[revenuecat] unknown app_user_id", { appUserId });
    return res.status(200).json({ status: "ignored", reason: "unknown_user" });
  }

  try {
    await subscriptionLifecycle.changePlan(appUserId, planCode, {
      actor: { _id: appUserId, role: user.role, onBehalfOf: false },
      reason: "iap_purchase",
      pricePaid: Number(event.price_in_purchased_currency) || 0,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      createdBy: { user: appUserId, role: user.role },
      metadata: {
        source: "revenuecat",
        productId,
        store: event.store,
        rcEventId: event.id,
        rcEventType: type,
      },
      cancelReason: "Auto-cancelled on IAP plan change",
    });
    logger.info("[revenuecat] granted plan", { appUserId, planCode, type });
    return res.status(200).json({ status: "ok" });
  } catch (err) {
    // 500 lets RevenueCat retry transient failures.
    logger.error("[revenuecat] grant failed", {
      appUserId,
      planCode,
      error: err.message,
    });
    return res.status(500).json({ status: "error", message: "grant_failed" });
  }
});
