/**
 * Money utilities and Authoritative Quote builder.
 * Single source of truth across @halaa/shared, halaa-backend, halaa-web, and halaa-mobile (PLN-02).
 *
 * All money arithmetic operates on:
 *   - SAR major units (Number with max 2 decimal places, half-up EPSILON guarded)
 *   - Halalas integer minor units (1 SAR = 100 Halalas, Math.round((sar + EPSILON) * 100))
 *
 * @module shared/utils/money
 */

/**
 * Round to 2 decimal places (SAR halalas), half-up, EPSILON-guarded.
 * @param {number|string} value
 * @returns {number}
 */
export function round2(value) {
  if (value == null) return 0;
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Convert SAR major units to integer Halalas (minor units).
 * @param {number|string} sarAmount
 * @returns {number} integer halalas
 */
export function toHalalas(sarAmount) {
  if (sarAmount == null) return 0;
  const num = typeof sarAmount === "string" ? parseFloat(sarAmount) : Number(sarAmount);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100);
}

/**
 * Convert Halalas (minor units) to SAR major units (2 decimal places).
 * @param {number|string} halalas
 * @returns {number} SAR
 */
export function halalasToSar(halalas) {
  if (halalas == null) return 0;
  const num = typeof halalas === "string" ? parseInt(halalas, 10) : Number(halalas);
  if (!Number.isFinite(num)) return 0;
  return round2(num / 100);
}

/**
 * Formats a monetary amount in SAR with exact decimal precision (never truncated to 0 dp).
 *
 * @param {number|string} amount
 * @param {Object} [options]
 * @param {number} [options.decimals=2] - fixed decimal places (default 2)
 * @param {boolean} [options.trimTrailingZeros=false] - trim .00 if whole number
 * @param {boolean} [options.includeCurrency=false]
 * @param {string} [options.currency='SAR']
 * @returns {string}
 */
export function formatSar(amount, options = {}) {
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
  const currency = options.currency || "SAR";
  if (amount == null || !Number.isFinite(num)) {
    return options.includeCurrency ? `0.00 ${currency}` : "0.00";
  }
  const rounded = round2(num);
  const decimals = typeof options.decimals === "number" ? options.decimals : 2;
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
 * Allocate a discount across discountable line items proportionally by their
 * subtotal. Returns a Map of lineItemId → allocated amount.
 * The remainder from rounding lands on the largest line so the sum is exact.
 *
 * @param {Array<{id:string, subtotal:number}>} items
 * @param {number} discount - total discount (SAR), >= 0
 * @returns {Map<string, number>}
 */
export function allocateDiscount(items, discount) {
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

  const remainder = round2(cappedDiscount - allocated);
  if (remainder !== 0 && largest) {
    allocations.set(largest.id, round2(allocations.get(largest.id) + remainder));
  }
  return allocations;
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
export function buildCheckoutQuote({
  plan,
  addons = [],
  discountAmount = 0,
  discountCode = null,
  setupFee = 0,
  currency = "SAR",
  ttlMs = 15 * 60 * 1000,
}) {
  const planPrice = round2(plan?.pricing?.oneTime ?? plan?.price ?? 0);

  const discountableItems = [
    {
      id: "plan",
      type: "plan",
      referenceId: plan?._id || plan?.id || null,
      code: plan?.code || null,
      label: plan?.nameEn || plan?.nameAr || plan?.name || plan?.code || "Plan",
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
        type: "addon",
        addonType: a.addonType || a.type,
        templateType: a.templateType || null,
        referenceId: a.referenceId || null,
        label: a.label || a.addonType || "Add-on",
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
      type: "setup_fee",
      referenceId: null,
      label: "One-time setup fee",
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
    currency: plan?.currency || currency || "SAR",
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
