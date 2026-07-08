/**
 * Money rules — single source of truth (business-account plan, B0 #14/#21).
 *
 * CONTRACT:
 *   - All amounts are SAR major-unit `Number` (consistent with the whole
 *     payment system; Moyasar conversion to halalas happens at the provider).
 *   - Rounding: 2 decimal places (halalas), half-up, EPSILON-guarded.
 *   - Discount base = discountable line items only (plan + addons). The setup
 *     fee is NEVER discounted and is added AFTER the discount.
 *   - Discount is allocated across discountable line items proportionally by
 *     subtotal; the rounding remainder lands on the largest line so the
 *     allocations always sum back to the discount.
 *   - Tax: prices are VAT-inclusive in this system; no separate tax line is
 *     computed (taxAmount = 0). The `tax` line-item type exists for forward
 *     compatibility but is not populated by the quote builder.
 *
 * @module shared/utils/money
 */

/** Round to 2 dp (SAR halalas), half-up, EPSILON-guarded. */
function round2(value) {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Allocate a discount across discountable line items proportionally by their
 * subtotal. Returns a Map of lineItemId → allocated amount (negative space is
 * caller's concern; here allocation is a positive number to subtract).
 *
 * @param {Array<{id:string, subtotal:number}>} items
 * @param {number} discount - total discount (SAR), >= 0
 * @returns {Map<string, number>}
 */
function allocateDiscount(items, discount) {
  const allocations = new Map();
  const base = items.reduce((s, it) => s + (it.subtotal || 0), 0);
  if (discount <= 0 || base <= 0) {
    items.forEach((it) => allocations.set(it.id, 0));
    return allocations;
  }

  const cappedDiscount = Math.min(round2(discount), round2(base));
  let allocated = 0;
  let largest = null;
  items.forEach((it) => {
    const share = round2((it.subtotal / base) * cappedDiscount);
    allocations.set(it.id, share);
    allocated += share;
    if (!largest || it.subtotal > largest.subtotal) largest = it;
  });

  // Push the rounding remainder onto the largest line so the parts sum exactly.
  const remainder = round2(cappedDiscount - allocated);
  if (remainder !== 0 && largest) {
    allocations.set(largest.id, round2(allocations.get(largest.id) + remainder));
  }
  return allocations;
}

module.exports = { round2, allocateDiscount };
