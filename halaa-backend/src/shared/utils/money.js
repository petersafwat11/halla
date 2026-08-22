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

/**
 * Convert SAR major units to integer Halalas (minor units).
 * @param {number|string} sarAmount
 * @returns {number} integer halalas
 */
function toHalalas(sarAmount) {
  if (sarAmount == null) return 0;
  const num = typeof sarAmount === 'string' ? parseFloat(sarAmount) : Number(sarAmount);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100);
}

/**
 * Convert Halalas (minor units) to SAR major units (2 decimal places).
 * @param {number|string} halalas
 * @returns {number} SAR
 */
function halalasToSar(halalas) {
  if (halalas == null) return 0;
  const num = typeof halalas === 'string' ? parseInt(halalas, 10) : Number(halalas);
  if (!Number.isFinite(num)) return 0;
  return round2(num / 100);
}

/**
 * Formats a monetary amount in SAR with exact decimal representation.
 * @param {number|string} amount
 * @param {Object} [options]
 * @returns {string}
 */
function formatSar(amount, options = {}) {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  const currency = options.currency || 'SAR';
  if (amount == null || !Number.isFinite(num)) {
    return options.includeCurrency ? `0.00 ${currency}` : '0.00';
  }
  const rounded = round2(num);
  const decimals = typeof options.decimals === 'number' ? options.decimals : 2;
  let formatted = rounded.toFixed(decimals);
  if (options.trimTrailingZeros) {
    formatted = rounded % 1 === 0 ? String(rounded) : rounded.toFixed(decimals);
  }
  if (options.includeCurrency) {
    return `${formatted} ${currency}`;
  }
  return formatted;
}

/**
 * Pure authoritative checkout quote calculation.
 *
 * @param {Object} params
 * @param {Object} params.plan
 * @param {Array}  [params.addons]
 * @param {number} [params.discountAmount]
 * @param {string} [params.discountCode]
 * @param {number} [params.setupFee]
 * @param {string} [params.currency]
 * @param {number} [params.ttlMs]
 * @returns {Object} Canonical checkout quote
 */
function buildCheckoutQuote({
  plan,
  addons = [],
  discountAmount = 0,
  discountCode = null,
  setupFee = 0,
  currency = 'SAR',
  ttlMs = 15 * 60 * 1000,
}) {
  const planPrice = round2(plan?.pricing?.oneTime ?? plan?.price ?? 0);

  const discountableItems = [
    {
      id: 'plan',
      type: 'plan',
      referenceId: plan?._id || plan?.id || null,
      code: plan?.code || null,
      label: plan?.nameEn || plan?.nameAr || plan?.name || plan?.code || 'Plan',
      quantity: 1,
      unitAmount: planPrice,
      subtotal: planPrice,
    },
    ...addons.map((a, i) => {
      const qty = a.quantity || 1;
      const sub = round2(
        a.price != null ? a.price : qty * round2(a.unitAmount ?? a.unitPrice ?? 0)
      );
      const unit = round2(
        a.unitAmount != null
          ? a.unitAmount
          : a.unitPrice != null
          ? a.unitPrice
          : qty > 0
          ? sub / qty
          : sub
      );
      return {
        id: `addon_${i}`,
        type: 'addon',
        addonType: a.addonType || a.type,
        templateType: a.templateType || null,
        referenceId: a.referenceId || null,
        label: a.label || a.addonType || 'Add-on',
        quantity: qty,
        unitAmount: unit,
        subtotal: sub,
      };
    }),
  ];

  const discountableBase = round2(
    discountableItems.reduce((s, it) => s + it.subtotal, 0)
  );
  const rawDiscount = round2(discountAmount || 0);
  const discount = Math.min(rawDiscount, discountableBase);
  const allocations = allocateDiscount(discountableItems, discount);

  const lineItems = discountableItems.map((it) => {
    const discountAllocation = round2(allocations.get(it.id) || 0);
    const lineTotal = round2(it.subtotal - discountAllocation);
    return {
      type: it.type,
      addonType: it.addonType || undefined,
      templateType: it.templateType || undefined,
      referenceId: it.referenceId,
      code: it.code || undefined,
      label: it.label,
      quantity: it.quantity,
      unitAmount: it.unitAmount,
      subtotal: it.subtotal,
      discountAllocation,
      taxAmount: 0,
      total: lineTotal,
      totalHalalas: toHalalas(lineTotal),
    };
  });

  const rawSetupFee = round2(setupFee || 0);
  if (rawSetupFee > 0) {
    lineItems.push({
      type: 'setup_fee',
      referenceId: null,
      label: 'One-time setup fee',
      quantity: 1,
      unitAmount: rawSetupFee,
      subtotal: rawSetupFee,
      discountAllocation: 0,
      taxAmount: 0,
      total: rawSetupFee,
      totalHalalas: toHalalas(rawSetupFee),
    });
  }

  const addonsTotal = round2(discountableBase - planPrice);
  const total = Math.max(0, round2(lineItems.reduce((s, li) => s + li.total, 0)));
  const quoteExpiresAt = new Date(Date.now() + ttlMs);

  return {
    plan: {
      id: plan?._id || plan?.id || null,
      code: plan?.code || null,
      nameAr: plan?.nameAr || null,
      nameEn: plan?.nameEn || null,
    },
    planPrice,
    planPriceHalalas: toHalalas(planPrice),
    addonsTotal,
    addonsTotalHalalas: toHalalas(addonsTotal),
    subtotal: discountableBase,
    subtotalHalalas: toHalalas(discountableBase),
    discountAmount: discount,
    discountAmountHalalas: toHalalas(discount),
    discountCode: discount > 0 ? discountCode : null,
    setupFee: rawSetupFee,
    setupFeeHalalas: toHalalas(rawSetupFee),
    taxAmount: 0,
    taxAmountHalalas: 0,
    total,
    totalHalalas: toHalalas(total),
    currency: plan?.currency || currency || 'SAR',
    lineItems,
    formatted: {
      planPrice: formatSar(planPrice),
      addonsTotal: formatSar(addonsTotal),
      subtotal: formatSar(discountableBase),
      discountAmount: formatSar(discount),
      setupFee: formatSar(rawSetupFee),
      total: formatSar(total),
    },
    quoteExpiresAt,
  };
}

module.exports = {
  round2,
  toHalalas,
  halalasToSar,
  formatSar,
  allocateDiscount,
  buildCheckoutQuote,
};
