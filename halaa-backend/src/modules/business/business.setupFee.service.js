/**
 * Business Setup-Fee Service
 *
 * Centralizes the once-per-account, settle-on-first-activation rule
 * (business-account plan #2/#5). One entitlement record per business.
 *
 * @module modules/business/business.setupFee.service
 */

const mongoose = require('mongoose');
const BusinessSetupFee = require('../../../models/BusinessSetupFeeModel');
const { SETUP_FEE_STATUS } = require('../../../models/BusinessSetupFeeModel');
const logger = require('../../shared/utils/logger');

class BusinessSetupFeeService {
  /**
   * Get (or lazily create) the entitlement for a business.
   * @param {string} businessUserId
   * @param {import('mongoose').ClientSession} [session]
   */
  async getOrCreate(businessUserId, session = null) {
    let entitlement = await BusinessSetupFee.findOne({ businessUserId }).session(
      session || null
    );
    if (entitlement) return entitlement;
    try {
      const docs = await BusinessSetupFee.create(
        [
          {
            businessUserId,
            status: SETUP_FEE_STATUS.PENDING,
            amount: 1200,
            currency: 'SAR',
          },
        ],
        { session: session || undefined }
      );
      return docs[0];
    } catch (err) {
      // Unique race — another path created it; re-read.
      if (err.code === 11000) {
        return BusinessSetupFee.findOne({ businessUserId }).session(session || null);
      }
      throw err;
    }
  }

  /**
   * Has this account already settled its setup fee (paid or waived)?
   * @param {string} businessUserId
   * @returns {Promise<boolean>}
   */
  async isSettled(businessUserId) {
    const e = await BusinessSetupFee.findOne({ businessUserId }).select('settled');
    return !!e?.settled;
  }

  /**
   * Compute the setup fee OWED for an activating plan. Settle-on-first-activation:
   * once settled (any prior activation/grant/zero-fee plan), the fee is 0
   * forever; otherwise it's the activating plan's `setupFeeAmount`.
   *
   * @param {string} businessUserId
   * @param {Object} plan - Plan doc (reads `setupFeeAmount`)
   * @returns {Promise<number>} SAR major units
   */
  async computeOwed(businessUserId, plan) {
    if (await this.isSettled(businessUserId)) return 0;
    return plan?.setupFeeAmount || 0;
  }

  /**
   * Settle the fee permanently as WAIVED (direct grant / mode A).
   */
  async settleWaived(businessUserId, { plan, assignmentId, waivedBy, reason }, session = null) {
    const entitlement = await this.getOrCreate(businessUserId, session);
    if (entitlement.settled) return entitlement;
    entitlement.status = SETUP_FEE_STATUS.WAIVED;
    entitlement.settled = true;
    entitlement.settledAt = new Date();
    entitlement.amount = plan?.setupFeeAmount || 0;
    entitlement.settledByPlanId = plan?._id || null;
    entitlement.assignmentId = assignmentId || null;
    entitlement.waivedBy = waivedBy || null;
    entitlement.waiveReason = reason || 'direct_grant';
    await entitlement.save({ session: session || undefined });
    return entitlement;
  }

  /**
   * Settle the fee permanently as PAID on a successful first activation. A
   * zero-fee first plan (quarterly/annual) settles permanently too. `amount`
   * is the fee actually charged (0 for q/a). [#5]
   */
  async settlePaid(
    businessUserId,
    { plan, amount, paymentId, lineItemId, assignmentId },
    session = null
  ) {
    const entitlement = await this.getOrCreate(businessUserId, session);
    if (entitlement.settled) return entitlement;
    entitlement.status = SETUP_FEE_STATUS.PAID;
    entitlement.settled = true;
    entitlement.settledAt = new Date();
    entitlement.amount = amount ?? plan?.setupFeeAmount ?? 0;
    entitlement.settledByPlanId = plan?._id || null;
    entitlement.paymentId = paymentId || null;
    entitlement.lineItemId = lineItemId || null;
    entitlement.assignmentId = assignmentId || null;
    entitlement.paidAt = new Date();
    await entitlement.save({ session: session || undefined });
    return entitlement;
  }

  /**
   * Re-open eligibility after refunding a setup fee in the
   * paid-but-activation-failed case ONLY (no setup was delivered). Non-refundable
   * after a successful activation. [#5]
   */
  async reopenAfterFailedActivation(businessUserId) {
    const entitlement = await BusinessSetupFee.findOne({ businessUserId });
    if (!entitlement) return null;
    entitlement.status = SETUP_FEE_STATUS.REFUNDED;
    entitlement.settled = false;
    entitlement.settledAt = null;
    entitlement.refundedAt = new Date();
    await entitlement.save();
    logger.info('[setupFee] re-opened eligibility after failed activation', {
      businessUserId: String(businessUserId),
    });
    return entitlement;
  }
}

module.exports = new BusinessSetupFeeService();
