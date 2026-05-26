/**
 * Plans Service
 * Business logic for subscription plans
 * @module modules/plans/plans.service
 */

const mongoose = require('mongoose');

const { NotFoundError, ValidationError, ConflictError } = require('../../shared/errors');
const { isPoolPlan, COMPENSATION_PERCENTAGE } = require('../../shared/constants/plans');
const logger = require('../../shared/utils/logger');

const Plan = require('../../../models/PlanModel');
const Subscription = require('../../../models/SubscriptionModel');

class PlansService {
  /**
   * Get all active plans (public). Excludes platform-only plans.
   * @returns {Promise<Object>}
   */
  async getActivePlans() {
    const plans = await Plan.find({
      isActive: true,
      availableFor: { $ne: 'platform_admin' },
    }).sort({ sortOrder: 1, createdAt: 1 });
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
  async getAllPlansAdmin(filters = {}) {
    const query = {};
    if (filters.availableFor) query.availableFor = filters.availableFor;
    const plans = await Plan.find(query).sort({ sortOrder: 1, createdAt: 1 });
    return { plans: plans.map((p) => this._formatPlan(p)) };
  }

  /**
   * Create a new plan. SUPER_ADMIN-only at the route layer (now via
   * `requirePageAccess(MANAGE_PLANS, 'create')`). Hard-rejects duplicate
   * `code` so callers get a clean ConflictError instead of E11000.
   *
   * @param {Object} data
   * @returns {Promise<{ plan }>} Audit middleware reads `before: null`
   *          implicitly (mirrors updatePlanByCode shape).
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
      isActive: data.isActive ?? true,
      isPublic: data.isPublic ?? true,
    });

    return { plan: this._formatPlan(plan) };
  }

  /**
   * Soft-delete a plan. Hard delete is intentionally blocked to preserve
   * historical subscriptions. Returns 409 (ConflictError) when active
   * subscribers exist.
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
   * Update plan by code (admin).
   *
   * Rejects destructive limit reductions when active subscribers would
   * breach the new ceiling, and returns before/after snapshots so the
   * route-level audit middleware can record the diff.
   *
   * The read-then-write (existence check, breach guard, write) is wrapped
   * in a single Mongo transaction so a concurrent subscription create
   * cannot slip past the breach check between the read and the update.
   *
   * @param {string} code
   * @param {Object} updateData
   * @returns {Promise<{ plan, before, after }>}
   */
  async updatePlanByCode(code, updateData) {
    // Whitelist allowed update fields (kept in sync with PlanModel).
    const allowedFields = [
      'nameAr', 'nameEn', 'descriptionAr', 'descriptionEn',
      'isActive', 'isPublic', 'pricing', 'limits', 'features',
      'setupFeeAmount', 'featureBullets',
      'sortOrder', 'isPopular',
    ];
    const safeUpdate = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        safeUpdate[field] = updateData[field];
      }
    }

    let result;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const existing = await Plan.findOne({ code }).session(session);
        if (!existing) throw new NotFoundError('Plan');

        // Block destructive limit reductions when at least one active
        // subscriber would exceed the new ceiling. Reads inside the same
        // transaction so a concurrent write can't sneak past.
        if (safeUpdate.limits) {
          await this._guardLimitReductions(existing, safeUpdate.limits, session);
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
          session,
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

        result = { plan: this._formatPlan(plan), before, after };
      });
    } finally {
      session.endSession();
    }

    return result;
  }

  /**
   * Internal: reject limit reductions that would orphan existing
   * subscribers above the new ceiling.
   *
   * @param {Object} existingPlan
   * @param {Object} newLimits
   * @param {import('mongoose').ClientSession} [session] — caller's transaction session.
   * @private
   */
  async _guardLimitReductions(existingPlan, newLimits, session) {
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

    const subQuery = Subscription.find({
      planId: existingPlan._id,
      status: { $in: ['active', 'trial'] },
    }).select('_id userId usage invitePool invitesConsumed compensationPool');
    if (session) subQuery.session(session);
    const activeSubscribers = await subQuery;

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
          // Breach check: any of the subscriber's live/scheduled events
          // with a guestLimit greater than the new ceiling. Completed /
          // cancelled events keep their snapshotted limit and don't
          // matter.
          try {
            // Lazy require to avoid circular import (plans → events).
            const Event = require('../../../models/EventModel');
            const eventQuery = Event.find({
              host: sub.userId,
              status: { $in: ['live', 'scheduled'] },
              guestLimit: { $gt: newLimit },
            })
              .select('_id guestLimit')
              .limit(1);
            if (session) eventQuery.session(session);
            const breaching = await eventQuery;
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
            logger.warn(
              '[plans.update] event-breach lookup failed; falling back to conservative block',
              { error: eventErr?.message }
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
   * Get landing plans — returns host + business plans for the landing page
   * @returns {Promise<Object>}
   */
  async getLandingPlans() {
    const [hostResult, businessResult] = await Promise.all([
      this.getHostPlans(),
      this.getBusinessPlans(),
    ]);
    return { host: hostResult, business: businessResult };
  }

  /**
   * Format plan for response
   * @private
   */
  _formatPlan(plan) {
    const isPool = isPoolPlan(plan.planType);
    const invitePool = plan.limits?.invitePool ?? null;
    const features = plan.features?.toObject ? plan.features.toObject() : (plan.features || {});
    const featureBullets = plan.featureBullets?.toObject
      ? plan.featureBullets.toObject()
      : (plan.featureBullets || { ar: [], en: [] });
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
      compensationPool: isPool && invitePool !== null
        ? Math.floor(invitePool * (COMPENSATION_PERCENTAGE / 100))
        : null,
      features,
      setupFeeAmount: plan.setupFeeAmount || 0,
      featureBullets: { ar: featureBullets.ar || [], en: featureBullets.en || [] },
      isActive: plan.isActive, sortOrder: plan.sortOrder,
    };
  }
}

module.exports = new PlansService();
