/**
 * Strict runtime product→code resolver (BILL-01 · §1 · closes P0-14).
 *
 * The canonical generated maps are the DEFAULT source of truth; the
 * `REVENUECAT_PRODUCT_PLAN_MAP` / `REVENUECAT_ADDON_PRODUCT_MAP` env JSON may
 * override a mapping (e.g. point a real console product id at a catalog code)
 * — but ONLY when the override is strictly valid. Previously a malformed env
 * map silently became `{}` (P0-14); now every override is validated and any
 * violation is surfaced as an error that fails billing readiness, while the
 * valid canonical + valid overrides keep resolving (fail closed on the bad
 * entry, never crash the whole map).
 *
 * Rejected (and reported): invalid JSON, non-object/non-string shapes, unknown
 * target codes, cross-type mappings (a plan map pointing at an add-on code or
 * vice-versa), product ids that CONFLICT with a canonical product id (same id,
 * different code), and duplicate ids claimed by both the plan AND add-on maps.
 *
 * Pure w.r.t. its `env` argument (defaults to process.env) — no I/O, so it is
 * fully unit-testable and safe to call from readiness and from the webhook.
 */

const commerce = require("./index");

/** Parse a JSON env map strictly. Empty/undefined is a valid empty override. */
function parseStrict(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return { ok: true, obj: {} };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { ok: false, error: `invalid_json: ${err.message}` };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "not_a_json_object" };
  }
  for (const [k, v] of Object.entries(parsed)) {
    if (!k || typeof v !== "string" || v.trim() === "") {
      return { ok: false, error: `non_string_mapping: ${JSON.stringify(k)}` };
    }
  }
  return { ok: true, obj: parsed };
}

/**
 * Resolve the validated plan/add-on product→code maps.
 *
 * @param {object} [env=process.env]
 * @returns {{
 *   ok: boolean,
 *   integrity: object,
 *   planMap: Record<string,string>,
 *   addonMap: Record<string,string>,
 *   errors: Array<{ map:string, productId?:string, code:string, detail:string }>,
 * }}
 */
function resolveProductMaps(env = process.env) {
  const integrity = commerce.getCatalogIntegrity();

  const canonicalPlan = commerce.getStorePlanProductMap();
  const canonicalAddon = commerce.getStoreAddonProductMap();
  const validPlanCodes = commerce.storeEligibleCodes("plan");
  const validAddonCodes = commerce.storeEligibleCodes("addon");

  // productId → canonical code across BOTH maps (for conflict detection).
  const canonicalById = new Map();
  for (const [pid, code] of Object.entries(canonicalPlan)) canonicalById.set(pid, code);
  for (const [pid, code] of Object.entries(canonicalAddon)) canonicalById.set(pid, code);

  const errors = [];
  const planMap = { ...canonicalPlan };
  const addonMap = { ...canonicalAddon };

  const planParsed = parseStrict(env.REVENUECAT_PRODUCT_PLAN_MAP);
  const addonParsed = parseStrict(env.REVENUECAT_ADDON_PRODUCT_MAP);
  if (!planParsed.ok) errors.push({ map: "plan", code: "env_parse", detail: planParsed.error });
  if (!addonParsed.ok) errors.push({ map: "addon", code: "env_parse", detail: addonParsed.error });

  const planOverrides = planParsed.ok ? planParsed.obj : {};
  const addonOverrides = addonParsed.ok ? addonParsed.obj : {};

  // Duplicate across maps: a product id may not be claimed by both.
  for (const pid of Object.keys(planOverrides)) {
    if (Object.prototype.hasOwnProperty.call(addonOverrides, pid)) {
      errors.push({ map: "both", productId: pid, code: "duplicate_cross_map", detail: "product id mapped by BOTH plan and add-on overrides" });
    }
  }

  const applyOverride = (overrides, targetMap, targetCodes, otherCodes, mapName) => {
    for (const [pid, code] of Object.entries(overrides)) {
      // conflict with a canonical product id pointing at a different code.
      if (canonicalById.has(pid) && canonicalById.get(pid) !== code) {
        errors.push({ map: mapName, productId: pid, code: "conflicts_canonical", detail: `canonical maps ${pid}→${canonicalById.get(pid)}, override says →${code}` });
        continue;
      }
      // cross-type: code belongs to the OTHER catalog type.
      if (!targetCodes.has(code)) {
        const detail = otherCodes.has(code) ? "cross_type_code" : "unknown_code";
        errors.push({ map: mapName, productId: pid, code: detail, detail: `code "${code}" not a store-eligible ${mapName} code` });
        continue;
      }
      // duplicate-across-maps already flagged; skip applying it to avoid ambiguity.
      if (mapName === "plan" && Object.prototype.hasOwnProperty.call(addonOverrides, pid)) continue;
      targetMap[pid] = code;
    }
  };

  applyOverride(planOverrides, planMap, validPlanCodes, validAddonCodes, "plan");
  applyOverride(addonOverrides, addonMap, validAddonCodes, validPlanCodes, "addon");

  return {
    ok: integrity.ok && errors.length === 0,
    integrity,
    planMap,
    addonMap,
    errors,
  };
}

module.exports = { resolveProductMaps, parseStrict };
