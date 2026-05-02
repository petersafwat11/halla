/**
 * Plans Service
 * Business logic for subscription plans
 * @module modules/plans/plans.service
 */

const { NotFoundError } = require('../../shared/errors');
const { isPoolPlan, buildFeaturesArray, BUSINESS_SETUP_FEE } = require('../../shared/constants/plans');

const Plan = require('../../../models/PlanModel');

class PlansService {
  /**
   * Get all active plans
   * @returns {Promise<Object>}
   */
  async getActivePlans() {
    const plans = await Plan.find({ isActive: true }).sort({ tier: 1, createdAt: 1 });
    return { plans: plans.map((p) => this._formatPlan(p)) };
  }

  /**
   * Get business plans — returns event[], quarterly[], annual[]
   * @returns {Promise<Object>}
   */
  async getBusinessPlans() {
    const plans = await Plan.find({
      availableFor: 'whitelabel',
      isActive: true,
      planType: { $in: ['business_event', 'business_quarterly', 'business_annual'] },
    }).sort({ sortOrder: 1, 'pricing.oneTime': 1 });

    const result = {
      event: [],
      quarterly: [],
      annual: [],
      setupFeeRequired: true,
      setupFeeAmount: BUSINESS_SETUP_FEE,
    };

    for (const plan of plans) {
      const formatted = this._formatPlan(plan);
      if (plan.planType === 'business_event') result.event.push(formatted);
      else if (plan.planType === 'business_quarterly') result.quarterly.push(formatted);
      else if (plan.planType === 'business_annual') result.annual.push(formatted);
    }

    return result;
  }

  /**
   * Alias for backward compatibility
   * @returns {Promise<Object>}
   */
  async getEnterprisePlans() {
    return this.getBusinessPlans();
  }

  /**
   * Get host plans — returns basic/premium × event/monthly
   * @returns {Promise<Object>}
   */
  async getHostPlans() {
    const plans = await Plan.find({
      availableFor: 'host',
      isActive: true,
      planType: { $in: ['basic_event', 'basic_monthly', 'premium_event', 'premium_monthly'] },
    }).sort({ sortOrder: 1, 'pricing.oneTime': 1 });

    const result = {
      basic: { event: [], monthly: [] },
      premium: { event: [], monthly: [] },
    };

    for (const plan of plans) {
      const formatted = this._formatPlan(plan);
      if (plan.planType === 'basic_event') result.basic.event.push(formatted);
      else if (plan.planType === 'basic_monthly') result.basic.monthly.push(formatted);
      else if (plan.planType === 'premium_event') result.premium.event.push(formatted);
      else if (plan.planType === 'premium_monthly') result.premium.monthly.push(formatted);
    }

    return result;
  }

  /**
   * Get plan by ID
   * @param {string} planId
   * @returns {Promise<Object>}
   */
  async getPlanById(planId) {
    const plan = await Plan.findById(planId);
    if (!plan) {
      throw new NotFoundError('Plan');
    }
    return { plan: this._formatPlan(plan) };
  }

  /**
   * Get plan by code
   * @param {string} code
   * @returns {Promise<Object>}
   */
  async getPlanByCode(code) {
    const plan = await Plan.findOne({ code });
    if (!plan) {
      throw new NotFoundError('Plan');
    }
    return { plan: this._formatPlan(plan) };
  }

  /**
   * Get all plans (admin - includes inactive)
   */
  async getAllPlansAdmin() {
    const plans = await Plan.find({}).sort({ sortOrder: 1, tier: 1, createdAt: 1 });
    return { plans: plans.map((p) => this._formatPlan(p)) };
  }

  /**
   * Update plan by code (admin)
   */
  async updatePlanByCode(code, updateData) {
    // Whitelist allowed update fields
    const allowedFields = [
      'nameAr', 'nameEn', 'descriptionAr', 'descriptionEn',
      'isActive', 'pricing', 'limits', 'features', 'tier',
    ];
    const safeUpdate = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        safeUpdate[field] = updateData[field];
      }
    }

    const plan = await Plan.findOneAndUpdate({ code }, safeUpdate, { new: true, runValidators: true });
    if (!plan) throw new NotFoundError('Plan');
    return { plan: this._formatPlan(plan) };
  }

  /**
   * Format plan for response
   * @private
   */
  _formatPlan(plan) {
    const isPool = isPoolPlan(plan.planType);
    const invitePool = plan.limits?.invitePool ?? null;
    return {
      id: plan._id, code: plan.code,
      name: plan.name, nameAr: plan.nameAr, nameEn: plan.nameEn,
      description: plan.description, descriptionAr: plan.descriptionAr, descriptionEn: plan.descriptionEn,
      planType: plan.planType, planFamily: plan.planFamily, billingType: plan.billingType,
      availableFor: plan.availableFor,
      pricing: { oneTime: plan.pricing?.oneTime || 0 },
      price: plan.pricing?.oneTime || 0,
      currency: plan.currency || 'SAR',
      limits: plan.limits,
      invites: isPool ? null : (plan.limits?.maxInvitesPerEvent || 0),
      invitePool: isPool ? invitePool : null,
      compensationPool: isPool && invitePool !== null ? Math.floor(invitePool * 0.15) : null,
      compensationPercentage: plan.features?.compensationPercentage || 15,
      features: plan.features,
      featuresArray: buildFeaturesArray(plan.features),
      isActive: plan.isActive, sortOrder: plan.sortOrder,
    };
  }
}

module.exports = new PlansService();
