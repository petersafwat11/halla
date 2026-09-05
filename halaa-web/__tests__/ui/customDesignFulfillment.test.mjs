import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, "..", "..");
const read = (...parts) => fs.readFileSync(path.join(WEB_ROOT, ...parts), "utf8");

describe("PR6 Web: Custom Design Fulfillment Queue & Host Timeline (F-12)", () => {
  it("hooks/addons invalidates adminFulfillment, all, and my queries on fulfillment transition", () => {
    const mutationsSource = read("hooks", "addons", "mutations.js");
    const queriesSource = read("hooks", "addons", "queries.js");
    const keysSource = read("hooks", "addons", "keys.js");

    // Keys
    assert.match(keysSource, /adminFulfillment:\s*\(params\)\s*=>/, "addonsKeys must define adminFulfillment");

    // Queries
    assert.match(queriesSource, /export const useAdminFulfillment\s*=/, "queries must export useAdminFulfillment");
    assert.match(queriesSource, /API_PATHS\.addons\.adminFulfillment/, "useAdminFulfillment must call adminFulfillment path");

    // Mutations
    assert.match(mutationsSource, /export const useAdminTransitionFulfillment\s*=/, "mutations must export useAdminTransitionFulfillment");
    assert.match(mutationsSource, /API_PATHS\.addons\.adminTransition\(addonId\)/, "useAdminTransitionFulfillment must call adminTransition endpoint");
    assert.match(mutationsSource, /queryClient\.invalidateQueries\(\{\s*queryKey:\s*addonsKeys\.adminFulfillment\(\)\s*\}\)/, "must invalidate adminFulfillment query key");
    assert.match(mutationsSource, /queryClient\.invalidateQueries\(\{\s*queryKey:\s*addonsKeys\.my\(\)\s*\}\)/, "must invalidate my addons query key");
    assert.match(mutationsSource, /queryClient\.invalidateQueries\(\{\s*queryKey:\s*addonsKeys\.all\s*\}\)/, "must invalidate all addons query key");
  });

  it("Admin custom designs page is protected by requirePageAccess and pre?es server data", () => {
    const pageSource = read("app", "[lang]", "admin-dash", "custom-designs", "page.js");

    assert.match(pageSource, /requirePageAccess\(["']custom-designs["'],\s*lang\)/, "page must call requirePageAccess for custom-designs");
    assert.match(pageSource, /normalizeFulfillmentFilters/, "page must normalize filters");
    assert.match(pageSource, /API_PATHS\.addons\.adminFulfillment/, "page must prefetch from adminFulfillment endpoint");
    assert.match(pageSource, /<CustomDesignsPageContent\s*\/>/, "page must render CustomDesignsPageContent");
  });

  it("Admin navConfig and serverAuth include custom-designs for admin and moderator roles", () => {
    const navSource = read("ui", "layout", "navConfig.js");
    const authSource = read("services", "serverAuth.js");

    assert.match(navSource, /path:\s*["']\/admin-dash\/custom-designs["']/, "navConfig must have custom-designs path");
    assert.match(navSource, /custom-designs/, "ROLE_NAV_ACCESS must include custom-designs");
    assert.match(authSource, /CUSTOM_DESIGNS:\s*["']custom-designs["']/, "serverAuth must define CUSTOM_DESIGNS");
  });

  it("CustomDesignsTable implements server mode and exposes only the single valid next action", () => {
    const tableSource = read("app", "[lang]", "admin-dash", "custom-designs", "_components", "CustomDesignsTable.jsx");

    assert.match(tableSource, /mode=["']server["']/, "Table must be configured with server mode");
    assert.match(tableSource, /getNextFulfillmentStatus/, "Table must import getNextFulfillmentStatus");
    assert.match(tableSource, /formatDateTime/, "Table must use formatDateTime");
    assert.match(tableSource, /formatCurrency/, "Table must use formatCurrency");
    assert.match(tableSource, /orderRef/, "Table must display order reference");
    assert.match(tableSource, /nextAction/, "Table must display nextAction column");
  });

  it("CustomDesignTimeline renders API timestamps, never marks future steps complete, and wires support", () => {
    const timelineSource = read("components", "addons", "CustomDesignTimeline.jsx");

    // Canonical sequence
    assert.match(timelineSource, /DESIGN_FULFILLMENT_SEQUENCE/, "Timeline must import DESIGN_FULFILLMENT_SEQUENCE");
    assert.match(timelineSource, /DESIGN_FULFILLMENT_STATUS/, "Timeline must import DESIGN_FULFILLMENT_STATUS");

    // Formatting rules
    assert.match(timelineSource, /formatDateTime/, "Timeline must format timestamps with formatDateTime");
    assert.doesNotMatch(timelineSource, /\.toLocaleDateString|\.toLocaleString|new Intl\./, "Timeline must not use raw Intl or toLocaleString");

    // Expected delivery
    assert.match(timelineSource, /fulfillment\.expectedDeliveryAt/, "Timeline must check for expectedDeliveryAt");

    // Refund distinction
    assert.match(timelineSource, /refund_required|refunded/, "Timeline must handle refund statuses distinctly");

    // Support contact
    assert.match(timelineSource, /SUPPORT_SOURCE\.ADDON_FULFILLMENT/, "Timeline must use SUPPORT_SOURCE.ADDON_FULFILLMENT");
    assert.match(timelineSource, /buildSupportRequest/, "Timeline must call buildSupportRequest");
    assert.match(timelineSource, /kind:\s*["']addon["']/, "Timeline must pass opaque addon reference to support builder");
  });

  it("Host plans pages integrate CustomDesignTimeline", () => {
    const plansSource = read("app", "[lang]", "host", "plans", "PlansPage.js");
    const bizPlansSource = read("app", "[lang]", "host", "plans", "BusinessPlansPage.js");

    assert.match(plansSource, /CustomDesignTimeline/, "PlansPage must import CustomDesignTimeline");
    assert.match(plansSource, /useMyAddons/, "PlansPage must fetch user addons via useMyAddons");
    assert.match(plansSource, /customDesignAddons/, "PlansPage must filter for design addons");

    assert.match(bizPlansSource, /CustomDesignTimeline/, "BusinessPlansPage must import CustomDesignTimeline");
    assert.match(bizPlansSource, /useMyAddons/, "BusinessPlansPage must fetch user addons via useMyAddons");
    assert.match(bizPlansSource, /customDesignAddons/, "BusinessPlansPage must filter for design addons");
  });
});
