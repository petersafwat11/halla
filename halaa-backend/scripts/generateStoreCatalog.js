/**
 * Generate the canonical store-catalog artifacts (CAT-01).
 *
 *   node scripts/generateStoreCatalog.js          # write JSON manifest + docs
 *   node scripts/generateStoreCatalog.js --check   # verify committed == generated (CI drift gate)
 *
 * Pure + DB-free + credential-free: builds the catalog from source
 * (`src/shared/commerce/*` ← `planDefaults.js` / `addons.js`), validates it via
 * the Zod schema, then renders every downstream artifact from that single
 * source. `--check` regenerates deterministically and fails (exit 1) if any
 * committed output differs — the drift gate for `npm run catalog:verify`.
 *
 * ALL external identifiers emitted here are PROPOSED and NOT yet created in
 * Apple App Store Connect, Google Play, or RevenueCat.
 */

const fs = require("fs");
const path = require("path");
const { buildCatalog, catalogCounts } = require("../src/shared/commerce/buildCatalog");
const { RECURRING_ENTITLEMENT_ID } = require("../src/shared/commerce/catalog.schema");
const { computeManifestMeta } = require("../src/shared/commerce/catalog.integrity");

const backendRoot = path.join(__dirname, "..");
const repoRoot = path.join(backendRoot, "..");
const JSON_PATH = path.join(backendRoot, "src/shared/commerce/storeCatalog.generated.json");
const DOCS_DIR = path.join(repoRoot, "docs/evidence/store-readiness/generated");

const PROPOSED_BANNER =
  "> **GENERATED — do not edit by hand.** Source: `labbe-backend-/src/shared/commerce/` " +
  "(`catalog.overlay.js` + `buildCatalog.js`). Regenerate with `npm run catalog:generate`.\n>\n" +
  "> All Apple / Google / RevenueCat identifiers below are **PROPOSED** and **NOT yet created** " +
  "in any store console. Prices are shown in SAR from the current backend catalog; the stores " +
  "collect Saudi VAT (15%) and render the localized price string (PRICE-OWNER, signed 2026-07-01).\n";

const AR = (s) => s; // marker for RTL cells (kept verbatim)

// ── markdown helpers ─────────────────────────────────────────────────────────
const cell = (v) => (v === null || v === undefined || v === "" ? "—" : String(v));
const mdTable = (headers, rows) => {
  const head = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${r.map(cell).join(" | ")} |`).join("\n");
  return `${head}\n${sep}\n${body}\n`;
};

const storeEntries = (catalog) => catalog.filter((e) => e.storeEligible);
const plans = (catalog) => catalog.filter((e) => e.catalogType === "plan");
const addons = (catalog) => catalog.filter((e) => e.catalogType === "addon");

// ── artifact renderers ───────────────────────────────────────────────────────
function renderSkuMatrix(catalog, counts) {
  const rows = catalog.map((e) => [
    e.internalCode,
    e.catalogType,
    e.kind,
    e.eligibleAudiences.join("+"),
    e.billingPeriod,
    e.price,
    e.storeEligible ? "yes" : "**no**",
    cell(e.iosProductId),
    cell(e.androidBasePlanId),
  ]);
  return (
    `# Store SKU matrix (generated)\n\n${PROPOSED_BANNER}\n` +
    `**Totals:** ${counts.dbPlans} DB plans (${counts.storeEligiblePlans} store-eligible + ` +
    `${counts.nonStore} internal) · ${counts.addons} add-ons · ` +
    `**${counts.proposedProductsPerPlatform} proposed store products per platform**.\n\n` +
    mdTable(
      ["internal code", "type", "kind", "audience", "billing", "price SAR", "store?", "proposed product id (ios=android)", "android base plan"],
      rows
    )
  );
}

function renderAppleMap(catalog) {
  const rows = storeEntries(catalog).map((e) => [
    e.iosProductId,
    e.appleProductType,
    e.nameEn,
    e.price,
    e.revenueCatOfferingId,
  ]);
  return (
    `# Apple App Store Connect — product map (generated)\n\n${PROPOSED_BANNER}\n` +
    `One row per store-eligible product. \`consumable\` / \`auto_renewable_subscription\` drive review + Restore behavior. ` +
    `Subscriptions share one subscription group with ordered levels; consumables carry no Restore obligation.\n\n` +
    mdTable(["proposed product id", "apple product type", "reference name (EN)", "price SAR", "revenuecat offering"], rows)
  );
}

function renderGoogleMap(catalog) {
  const rows = storeEntries(catalog).map((e) => [
    e.androidProductId,
    e.googleProductType,
    e.androidBasePlanId,
    e.googleConsumable ? "consume" : "—",
    e.nameEn,
    e.price,
  ]);
  return (
    `# Google Play — product / base-plan map (generated)\n\n${PROPOSED_BANNER}\n` +
    `\`subs\` products require a base-plan id; \`inapp\` products are one-time (consumed on grant). ` +
    `RevenueCat maps each Android product (+ base plan for subs) to the package lookup key.\n\n` +
    mdTable(["proposed product id", "google product type", "base plan id", "consumption", "name (EN)", "price SAR"], rows)
  );
}

function renderRevenueCatMap(catalog) {
  const byOffering = {};
  for (const e of storeEntries(catalog)) {
    (byOffering[e.revenueCatOfferingId] ||= []).push(e);
  }
  let out =
    `# RevenueCat — offering / package / entitlement map (generated)\n\n${PROPOSED_BANNER}\n` +
    `Recurring access is derived from ONE entitlement: \`${RECURRING_ENTITLEMENT_ID}\` ` +
    `(PROPOSED \`REVENUECAT_RECURRING_ENTITLEMENT_ID\`). **No consumable/add-on carries any entitlement** ` +
    `(P0-09: a consumable attached to an entitlement would unlock it forever). Package lookup key === internal code, ` +
    `so mobile matches packages by code. Transfer behavior = "Keep with original App User ID" (DEC-04).\n\n`;
  for (const offering of Object.keys(byOffering).sort()) {
    out += `## Offering \`${offering}\`\n\n`;
    out += mdTable(
      ["package lookup key", "revenuecat type", "proposed product id (ios=android)", "entitlement", "kind"],
      byOffering[offering].map((e) => [
        e.revenueCatPackageLookupKey,
        e.revenueCatType,
        e.iosProductId,
        cell(e.revenueCatEntitlementId),
        e.kind,
      ])
    );
    out += "\n";
  }
  return out.trimEnd() + "\n";
}

function renderMetadataInventory(catalog) {
  const rows = catalog.map((e) => [
    e.internalCode,
    AR(e.nameAr),
    e.nameEn,
    e.descriptionAr ? "yes" : "—",
    e.descriptionEn ? "yes" : "—",
  ]);
  return (
    `# AR / EN product metadata inventory (generated)\n\n${PROPOSED_BANNER}\n` +
    `Every product has required AR + EN **names**. Descriptions are optional (most tiers render feature bullets, ` +
    `not a description). Extra-invite names are synthesized deterministically from the tier quantity.\n\n` +
    mdTable(["internal code", "name (AR)", "name (EN)", "desc AR?", "desc EN?"], rows)
  );
}

function renderExpectedCounts(catalog, counts) {
  const perType = Object.entries(counts.perPlanType)
    .map(([t, n]) => `| ${t} | ${n} |`)
    .join("\n");
  const classification = [
    ["design_template_*", "addon_consumable", "non_refundable_from_creation", "none", "managed_service_admin"],
    ["extra_invites_*", "addon_consumable", "clawback_unused", "backend_ledger", "automatic"],
    ["business_customization", "addon_consumable", "managed_service_legal_review", "none", "managed_service_admin"],
  ];
  return (
    `# Expected-count report (generated)\n\n${PROPOSED_BANNER}\n` +
    `## Counts\n\n` +
    mdTable(
      ["metric", "value"],
      [
        ["DB plans", counts.dbPlans],
        ["store-eligible plans", counts.storeEligiblePlans],
        ["add-ons (all store-eligible)", counts.addons],
        ["store-eligible add-ons", counts.storeEligibleAddons],
        ["**proposed store products per platform**", `**${counts.proposedProductsPerPlatform}**`],
        ["— subscriptions", counts.subscriptions],
        ["— event consumables", counts.eventConsumables],
        ["— add-on consumables", counts.addonConsumables],
        ["internal / non-store (trial + unlimited)", counts.nonStore],
      ]
    ) +
    `\n## Plans per planType\n\n| planType | count |\n| --- | --- |\n${perType}\n\n` +
    `## Signed add-on classifications (DEC-03 / DEC-03L)\n\n` +
    mdTable(["add-on", "kind", "refund policy", "restore", "fulfillment"], classification)
  );
}

// ── artifact set ─────────────────────────────────────────────────────────────
function buildArtifacts() {
  const catalog = buildCatalog(); // validates or throws
  const counts = catalogCounts(catalog);
  const meta = computeManifestMeta(catalog); // { catalogVersion, catalogHash, entryCount }

  const manifest = {
    $comment:
      "GENERATED — do not edit. Source: labbe-backend-/src/shared/commerce/{catalog.overlay,catalog.schema,buildCatalog}.js. " +
      "Regenerate: npm run catalog:generate. All ios/android/revenuecat identifiers are PROPOSED and NOT yet created.",
    generator: "labbe-backend-/scripts/generateStoreCatalog.js",
    // Version + deterministic content hash (§1). Billing readiness and every
    // durable webhook event stamp these; a mismatch fails billing observably.
    catalogVersion: meta.catalogVersion,
    catalogHash: meta.catalogHash,
    entryCount: meta.entryCount,
    recurringEntitlementId: RECURRING_ENTITLEMENT_ID,
    counts,
    entries: catalog,
  };

  return [
    { path: JSON_PATH, content: JSON.stringify(manifest, null, 2) + "\n" },
    { path: path.join(DOCS_DIR, "sku-matrix.generated.md"), content: renderSkuMatrix(catalog, counts) },
    { path: path.join(DOCS_DIR, "apple-product-map.generated.md"), content: renderAppleMap(catalog) },
    { path: path.join(DOCS_DIR, "google-product-map.generated.md"), content: renderGoogleMap(catalog) },
    { path: path.join(DOCS_DIR, "revenuecat-mapping.generated.md"), content: renderRevenueCatMap(catalog) },
    { path: path.join(DOCS_DIR, "metadata-inventory.generated.md"), content: renderMetadataInventory(catalog) },
    { path: path.join(DOCS_DIR, "expected-counts.generated.md"), content: renderExpectedCounts(catalog, counts) },
  ];
}

// Normalize CRLF→LF so a git autocrlf checkout never triggers a false drift.
const norm = (s) => s.replace(/\r\n/g, "\n");

/** Return the list of committed artifacts that differ from freshly-built output. */
function findDrift() {
  const drifted = [];
  for (const { path: p, content } of buildArtifacts()) {
    let current = null;
    try {
      current = fs.readFileSync(p, "utf8");
    } catch {
      current = null;
    }
    if (current === null || norm(current) !== norm(content)) {
      drifted.push(path.relative(repoRoot, p));
    }
  }
  return drifted;
}

function main() {
  const check = process.argv.includes("--check");
  const artifacts = buildArtifacts();

  if (check) {
    const drifted = findDrift();
    if (drifted.length) {
      console.error(
        `\n✗ catalog drift: ${drifted.length} generated artifact(s) differ from source.\n` +
          drifted.map((d) => `   - ${d}`).join("\n") +
          `\n\nRun \`npm run catalog:generate\` and commit the result.\n`
      );
      process.exit(1);
    }
    console.log(`✓ catalog in sync — ${artifacts.length} artifacts match source (no drift).`);
    return;
  }

  fs.mkdirSync(DOCS_DIR, { recursive: true });
  for (const { path: p, content } of artifacts) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
    console.log(`  wrote ${path.relative(repoRoot, p)}`);
  }
  console.log(`\n✓ generated ${artifacts.length} catalog artifacts.`);
}

module.exports = { buildArtifacts, findDrift, norm, JSON_PATH, DOCS_DIR };

if (require.main === module) main();
