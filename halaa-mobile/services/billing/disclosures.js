/**
 * Purchase-surface disclosures (§7). PURE — node-testable.
 *
 * Derives which localized disclosures a catalog entry requires from its
 * store-safe policy flags — never hardcoded per screen. Keys resolve under the
 * 'plans' i18n namespace ('disclosures.*').
 */

"use strict";

/** Ordered list of disclosure i18n keys for a catalog entry. */
function disclosuresFor(entry) {
  if (!entry) return [];
  const keys = [];

  if (entry.kind === "subscription") {
    keys.push("disclosures.autoRenew");
    keys.push("disclosures.manageSubscription");
  } else {
    keys.push("disclosures.oneTime");
  }

  // Design templates: single-use managed service, non-refundable from creation.
  if (entry.family === "design_template" || entry.refundPolicy === "non_refundable_from_creation") {
    keys.push("disclosures.designManaged");
  }
  // Business customization: managed provisioning / manual review.
  if (entry.family === "business_customization" || entry.refundPolicy === "managed_service_legal_review") {
    keys.push("disclosures.businessManaged");
  }
  // Consumables/add-ons: not restorable durable entitlements.
  if (entry.catalogType === "addon" || entry.kind === "event_consumable") {
    keys.push("disclosures.consumableNoRestore");
  }

  return keys;
}

/** Only subscriptions may be presented as restorable durable entitlements (§9). */
function isRestorable(entry) {
  return !!entry && entry.restoreBehavior === "store_restore" && entry.kind === "subscription";
}

/** Whether a "Manage Subscription" action is appropriate (recurring only). */
function showsManageSubscription(entry) {
  return !!entry && entry.kind === "subscription";
}

module.exports = { disclosuresFor, isRestorable, showsManageSubscription };
