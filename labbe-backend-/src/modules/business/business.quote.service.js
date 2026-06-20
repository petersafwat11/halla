/**
 * Business Quote Service
 *
 * Builds the AUTHORITATIVE server quote for a business plan assignment
 * (business-account plan #4/#21). The frontend never recomputes money — it
 * renders this quote and pays exactly what it says.
 *
 *   discountable = plan (+ addons)
 *   total        = round2(discountable − discount) + setupFee   (fee NOT discounted)
 *
 * Returns durable line items (plan, setup_fee, discount) ready to snapshot onto
 * the assignment and copy onto the Payment ledger.
 *
 * @module modules/business/business.quote.service
 */

const mongoose = require('mongoose');
const { round2, allocateDiscount } = require('../../shared/utils/money');
const setupFeeService = require('./business.setupFee.service');

const QUOTE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

class BusinessQuoteService {
  /**
   * @param {Object} params
   * @param {Object} params.plan - Plan doc
   * @param {string} params.businessUserId
   * @param {number} [params.discountAmount] - validated discount (SAR)
   * @param {string} [params.discountCode]
   * @param {Array}  [params.addons] - [{ referenceId, label, quantity, unitAmount }]
   * @returns {Promise<Object>} quote
   */
  async buildQuote({ plan, businessUserId, discountAmount = 0, discountCode = null, addons = [] }) {
    const currency = plan?.currency || 'SAR';
    const planPrice = round2(plan?.pricing?.oneTime ?? 0);

    // Discountable line items: plan + addons.
    const discountableItems = [
      {
        id: 'plan',
        type: 'plan',
        referenceId: plan?._id || null,
        label: plan?.nameEn || plan?.code || 'Business plan',
        quantity: 1,
        unitAmount: planPrice,
        subtotal: planPrice,
      },
      ...addons.map((a, i) => {
        const sub = round2((a.quantity || 1) * (a.unitAmount || 0));
        return {
          id: `addon_${i}`,
          type: 'addon',
          referenceId: a.referenceId || null,
          label: a.label || 'Add-on',
          quantity: a.quantity || 1,
          unitAmount: round2(a.unitAmount || 0),
          subtotal: sub,
        };
      }),
    ];

    const discountableBase = round2(
      discountableItems.reduce((s, it) => s + it.subtotal, 0)
    );
    const discount = Math.min(round2(discountAmount || 0), discountableBase);
    const allocations = allocateDiscount(discountableItems, discount);

    // Setup fee — settle-on-first-activation aware; NOT discountable; added after.
    const setupFee = await setupFeeService.computeOwed(businessUserId, plan);

    const lineItems = discountableItems.map((it) => {
      const discountAllocation = round2(allocations.get(it.id) || 0);
      return {
        type: it.type,
        referenceId: it.referenceId,
        label: it.label,
        quantity: it.quantity,
        unitAmount: it.unitAmount,
        subtotal: it.subtotal,
        discountAllocation,
        taxAmount: 0,
        total: round2(it.subtotal - discountAllocation),
      };
    });

    if (setupFee > 0) {
      lineItems.push({
        type: 'setup_fee',
        referenceId: null,
        label: 'One-time setup fee',
        quantity: 1,
        unitAmount: setupFee,
        subtotal: setupFee,
        discountAllocation: 0, // never discounted
        taxAmount: 0,
        total: setupFee,
      });
    }

    const total = round2(lineItems.reduce((s, li) => s + li.total, 0));

    return {
      lineItems,
      plan: { id: plan?._id, code: plan?.code, nameAr: plan?.nameAr, nameEn: plan?.nameEn },
      planPrice,
      addonsTotal: round2(discountableBase - planPrice),
      discount,
      discountCode: discount > 0 ? discountCode : null,
      setupFee,
      tax: 0,
      total,
      currency,
      quoteExpiresAt: new Date(Date.now() + QUOTE_TTL_MS),
    };
  }
}

module.exports = new BusinessQuoteService();
module.exports.QUOTE_TTL_MS = QUOTE_TTL_MS;
