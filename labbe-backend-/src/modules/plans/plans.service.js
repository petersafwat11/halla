/**
 * Plans Service
 * Business logic for subscription plans
 * @module modules/plans/plans.service
 */

const { NotFoundError, ValidationError, ConflictError } = require('../../shared/errors');
const { isPoolPlan, buildFeaturesArray, BUSINESS_SETUP_FEE } = require('../../shared/constants/plans');

const Plan = require('../../../models/PlanModel');
const Subscription = require('../../../models/SubscriptionModel');

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
   * Create a new plan (FLOW-08-F01).
   * SUPER_ADMIN-only at the route layer. Hard-rejects duplicate `code`
   * because the schema's unique index would otherwise raise a less-clear
   * E11000 error.
   *
   * @param {Object} data
   * @returns {Promise<{ plan, before: null }>} `before: null` shape mirrors
   *          updatePlanByCode so the audit middleware can read it uniformly.
   */
  async createPlan(data) {
    if (!data?.code) throw new ValidationError('Plan code is required');
    if (!data?.planType) throw new ValidationError('planType is required');
    if (!data?.nameAr || !data?.nameEn) {
      throw new ValidationError('nameAr and nameEn are required');
    }
    if (!data?.pricing || data.pricing.oneTime == null) {
      throw new ValidationError('pricing.oneTime is required');
    }
    if (!data?.limits) throw new ValidationError('limits are required');
    if (!data?.features) throw new ValidationError('features are required');

    const duplicate = await Plan.findOne({ code: data.code });
    if (duplicate) {
      throw new ConflictError(`Plan code "${data.code}" already exists`);
    }

    const plan = await Plan.create({
      ...data,
      isActive: data.isActive !== false,
      isPublic: data.isPublic !== false,
    });

    return { plan: this._formatPlan(plan) };
  }

  /**
   * Soft-delete a plan (FLOW-08-F01). Hard delete is intentionally
   * blocked to preserve historical subscriptions.
   * Returns 409 (ConflictError) when active subscribers exist.
   *
   * @param {string} code
   * @returns {Promise<{ plan, activeSubscribers }>}
   */
  async deletePlanByCode(code) {
    const plan = await Plan.findOne({ code });
    if (!plan) throw new NotFoundError('Plan');

    const activeSubscribers = await Subscription.countDocuments({
      planId: plan._id,
      status: { $in: ['active', 'trial'] },
    });

    if (activeSubscribers > 0) {
      const err = new ConflictError(
        `Cannot deactivate plan: ${activeSubscribers} active subscriber(s) on this plan`,
        'planId'
      );
      err.details = { activeSubscribers, planCode: code };
      throw err;
    }

    plan.isActive = false;
    await plan.save();

    return { plan: this._formatPlan(plan), activeSubscribers };
  }

  /**
   * Update plan by code (admin)
   *
   * FLOW-08-F02 / FLOW-08-F03: rejects destructive limit reductions
   * when active subscribers would breach the new ceiling, and returns
   * before/after snapshots so the route-level audit middleware can
   * record the diff (FLOW-08-F03).
   *
   * @param {string} code
   * @param {Object} updateData
   * @returns {Promise<{ plan, before, after }>}
   */
  async updatePlanByCode(code, updateData) {
    // Whitelist allowed update fields
    const allowedFields = [
      'nameAr', 'nameEn', 'descriptionAr', 'descriptionEn',
      'isActive', 'isPublic', 'pricing', 'limits', 'features', 'tier',
      'sortOrder', 'isPopular',
    ];
    const safeUpdate = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        safeUpdate[field] = updateData[field];
      }
    }

    const existing = await Plan.findOne({ code });
    if (!existing) throw new NotFoundError('Plan');

    // FLOW-08-F02: block destructive limit reductions when at least one
    // active subscriber would exceed the new ceiling.
    if (safeUpdate.limits) {
      await this._guardLimitReductions(existing, safeUpdate.limits);
    }

    const before = {
      pricing: existing.pricing?.toObject ? existing.pricing.toObject() : existing.pricing,
      limits: existing.limits?.toObject ? existing.limits.toObject() : existing.limits,
      features: existing.features?.toObject ? existing.features.toObject() : existing.features,
      isActive: existing.isActive,
      isPublic: existing.isPublic,
      nameAr: existing.nameAr,
      nameEn: existing.nameEn,
    };

    const plan = await Plan.findOneAndUpdate({ code }, safeUpdate, {
      new: true,
      runValidators: true,
    });

    const after = {
      pricing: plan.pricing?.toObject ? plan.pricing.toObject() : plan.pricing,
      limits: plan.limits?.toObject ? plan.limits.toObject() : plan.limits,
      features: plan.features?.toObject ? plan.features.toObject() : plan.features,
      isActive: plan.isActive,
      isPublic: plan.isPublic,
      nameAr: plan.nameAr,
      nameEn: plan.nameEn,
    };

    return { plan: this._formatPlan(plan), before, after };
  }

  /**
   * Internal: reject limit reductions that would orphan existing
   * subscribers above the new ceiling.
   * @private
   */
  async _guardLimitReductions(existingPlan, newLimits) {
    const oldLimits = existingPlan.limits || {};
    const reduces = (key) =>
      newLimits[key] !== undefined
      && newLimits[key] !== null
      && newLimits[key] !== -1
      && oldLimits[key] !== null
      && oldLimits[key] !== -1
      && newLimits[key] < oldLimits[key];

    const reducedKeys = ['maxEvents', 'maxInvitesPerEvent', 'invitePool']
      .filter(reduces);

    if (reducedKeys.length === 0) return;

    const activeSubscribers = await Subscription.find({
      planId: existingPlan._id,
      status: { $in: ['active', 'trial'] },
    }).select('_id userId usage invitePool invitesConsumed compensationPool');

    if (activeSubscribers.length === 0) return;

    const affected = [];
    for (const sub of activeSubscribers) {
      for (const key of reducedKeys) {
        const newLimit = newLimits[key];
        if (key === 'maxEvents') {
          const used = sub.usage?.eventsCreated || 0;
          if (used > newLimit) affected.push({ id: sub._id, key, used, newLimit });
        } else if (key === 'invitePool') {
          // Pool plans: if new pool ceiling is below already-consumed
          // invites, the subscriber is orphaned.
          const consumed = sub.invitesConsumed || 0;
          if (consumed > newLimit) affected.push({ id: sub._id, key, used: consumed, newLimit });
        } else if (key === 'maxInvitesPerEvent') {
          // M-18: previously this branch blocked unconditionally for
          // every active subscriber, so admins could never reduce
          // per-event ceilings even when no live event would breach the
          // new value. The actual breach check is whether any of the
          // subscriber's live/scheduled events has a guestLimit greater
          // than the new ceiling. Look it up directly.
          //
          // We only check live + scheduled events — completed/cancelled
          // events keep their snapshotted limit and don't matter.
          try {
            // Lazy require to avoid circular import (plans → events).
            const Event = require('../../../models/EventModel');
            const breaching = await Event.find({
              host: sub.userId,
              status: { $in: ['live', 'scheduled'] },
              guestLimit: { $gt: newLimit },
            })
              .select('_id guestLimit')
              .limit(1);
            if (breaching && breaching.length > 0) {
              affected.push({
                id: sub._id,
                key,
                used: breaching[0].guestLimit,
                newLimit,
                eventId: breaching[0]._id,
              });
            }
          } catch (eventErr) {
            // If the lookup fails, fall back to the conservative block
            // rather than silently allowing a destructive reduction.
            // eslint-disable-next-line no-console
            console.warn(
              "[plans.update] event-breach lookup failed; falling back to conservative block:",
              eventErr?.message
            );
            affected.push({ id: sub._id, key, used: oldLimits[key], newLimit });
          }
        }
      }
    }

    if (affected.length > 0) {
      throw new ValidationError(
        `Limit reduction blocked: ${affected.length} active subscriber(s) would breach the new ceiling`,
        [{ affectedCount: affected.length, reducedKeys, sample: affected.slice(0, 5) }]
      );
    }
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
