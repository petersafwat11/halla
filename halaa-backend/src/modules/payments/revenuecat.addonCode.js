/**
 * Add-on code grammar (BILL-01). PURE.
 *
 * Parses a canonical add-on internal code into the fields the fulfillment layer
 * needs. Mirrors the RevenueCat SKU-matrix grammar and the add-on-code contract
 * test. Unknown codes return null so the caller dead-letters rather than guesses.
 */

/** @returns {{addonType:string, quantity?:number, templateType?:string}|null} */
function parseAddonCode(code) {
  if (!code) return null;
  if (code === "business_customization") {
    return { addonType: "business_customization" };
  }
  let m = code.match(/^extra_invites_(\d+)$/);
  if (m) return { addonType: "extra_invites", quantity: Number(m[1]) };
  m = code.match(/^design_template_(.+)$/);
  if (m) return { addonType: "design_template", templateType: m[1] };
  return null;
}

module.exports = { parseAddonCode };
