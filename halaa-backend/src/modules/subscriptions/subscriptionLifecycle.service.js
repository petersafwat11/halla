/**
 * Shared subscription lifecycle primitives.
 *
 * Plan changes must create a fresh subscription instead of mutating the
 * subscription that existing events already reference. Existing events keep
 * their attached subscription; future events use the user's new subscription.
 */

const Subscription = require('../../../models/SubscriptionModel');
const Plan = require('../../../models/PlanModel');
const User = require('../../../models/UserModel');
const Addon = require('../../../models/AddonModel');
const { SUBSCRIPTION_STATUS, ACCOUNT_TYPES, ROLES } = require('../../shared/constants');
const { ADDON_TYPES } = require('../../shared/constants/addons');
const { NotFoundError, ValidationError } = require('../../shared/errors');
const { applyQuota } = require('../addons/addons.quota');
const { logAudit } = require('../../shared/utils/auditLog');
const logger = require('../../shared/utils/logger');

const ACTIVE_STATUSES = [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL];
const TRIAL_DURATION_DAYS = 14;

const isBusinessUser = (user) => user?.accountType === ACCOUNT_TYPES.BUSINESS;

const actorPayload = (actor) => {
  if (!actor) return {};
  if (typeof actor === 'string') return { user: actor };
  return {
    ...(actor.user || actor._id ? { user: actor.user || actor._id } : {}),
    ...(actor.role ? { role: actor.role } : {}),
    ...(actor.onBehalfOf !== undefined ? { onBehalfOf: actor.onBehalfOf } : {}),
  };
};

class SubscriptionLifecycleService {
  async changePlan(userId, planOrCode, options = {}) {
    if (!userId) throw new ValidationError('userId is required');

    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User');

    const plan = await this._resolvePlan(planOrCode);
    this._assertPlanAssignableToUser(plan, user);

    const existingActive = await Subscription.find({
      userId,
      status: { $in: ACTIVE_STATUSES },
    });

    let subscription;
    try {
      subscription = await Subscription.createForUser(userId, plan, {
        pricePaid: options.pricePaid ?? 0,
        currency: options.currency || plan.currency || 'SAR',
        status: options.status || (plan.code === 'trial'
          ? SUBSCRIPTION_STATUS.TRIAL
          : SUBSCRIPTION_STATUS.ACTIVE),
        createdBy: options.createdBy || {
          ...actorPayload(options.actor),
          onBehalfOf: options.createdBy?.onBehalfOf ?? options.actor?.onBehalfOf ?? true,
        },
      });
    } catch (err) {
      logger.error('[subscriptionLifecycle.changePlan] create failed', {
        userId: String(userId),
        planCode: plan.code,
        error: err?.message,
      });
      throw err;
    }

    if (plan.code === 'trial') {
      subscription.expiresAt = new Date(
        (subscription.activatedAt || subscription.createdAt).getTime()
          + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000
      );
    }

    const carried = isBusinessUser(user)
      ? this._remainingInvites(existingActive)
      : 0;
    if (
      carried > 0 &&
      subscription.invitePool !== null &&
      subscription.invitePool !== undefined
    ) {
      subscription.compensationPool = (subscription.compensationPool || 0) + carried;
    }

    subscription.metadata = {
      ...(subscription.metadata || {}),
      ...(options.metadata || {}),
      changedBy: options.actor?._id || options.actor?.user || options.actor || userId,
      changedAt: new Date().toISOString(),
      changeReason: options.reason || 'plan_change',
      replacedSubscriptionIds: existingActive.map((s) => String(s._id)),
      ...(carried > 0 ? { carriedInvites: carried } : {}),
    };
    if (options.paymentRecord?._id) {
      subscription.metadata.paymentId = options.paymentRecord._id;
      if (options.paymentRecord.paymentMethod?.type) {
        subscription.paymentMethod = {
          type: options.paymentRecord.paymentMethod.type,
          last4: options.paymentRecord.paymentMethod.last4,
          brand: options.paymentRecord.paymentMethod.company,
          expiryMonth: options.paymentRecord.paymentMethod.expiryMonth,
          expiryYear: options.paymentRecord.paymentMethod.expiryYear,
        };
      }
    }
    if (options.notes) subscription.notes = options.notes;
    await subscription.save();

    await User.findByIdAndUpdate(userId, {
      subscription: subscription._id,
      'profile.hostData.subscribedBefore': true,
    });

    for (const old of existingActive) {
      try {
        old.status = SUBSCRIPTION_STATUS.CANCELLED;
        old.cancelledAt = new Date();
        old.cancelReason =
          options.cancelReason || `Replaced by plan ${plan.code}`;
        old.metadata = {
          ...(old.metadata || {}),
          replacedBySubscription: subscription._id,
          replacedByPlanCode: plan.code,
          replacedAt: new Date().toISOString(),
          replacementReason: options.reason || 'plan_change',
        };
        await old.save();
      } catch (err) {
        logger.error('[subscriptionLifecycle.changePlan] old subscription cancel failed', {
          userId: String(userId),
          oldSubscriptionId: String(old._id),
          newSubscriptionId: String(subscription._id),
          error: err?.message,
        });
      }
    }

    await this._auditChange({ userId, plan, subscription, existingActive, options, carried });

    return {
      subscription,
      cancelledSubscriptions: existingActive,
      carriedInvites: carried,
    };
  }

  async grantExtraInvites(target, quantity, options = {}) {
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 500) {
      throw new ValidationError('quantity must be an integer between 1 and 500');
    }

    const subscription = await this._resolveSubscriptionTarget(target);
    if (!subscription) throw new NotFoundError('Subscription');
    if (!ACTIVE_STATUSES.includes(subscription.status)) {
      throw new ValidationError('Cannot grant invites to an inactive subscription');
    }
    if (subscription.invitePool === null || subscription.invitePool === undefined) {
      throw new ValidationError('Cannot grant extra invites to an unlimited subscription');
    }

    const addon = await Addon.create({
      userId: subscription.userId,
      subscriptionId: subscription._id,
      eventId: null,
      addonType: ADDON_TYPES.EXTRA_INVITES,
      quantity: qty,
      price: 0,
      currency: 'SAR',
      status: 'active',
      scope: 'pool',
      notes: options.reason || undefined,
      metadata: {
        grantedBy: options.actor?._id || options.actor?.user || options.actor || null,
        grantedByRole: options.actor?.role || null,
        reason: options.reason || 'admin_grant',
        grantedAt: new Date().toISOString(),
      },
    });

    await applyQuota(addon, {});

    await logAudit({
      action: 'subscription.extra_invites_granted',
      actor: {
        _id: options.actor?._id || options.actor?.user || options.actor || null,
        role: options.actor?.role || ROLES.ADMIN,
      },
      targetType: 'subscription',
      targetId: subscription._id,
      metadata: {
        userId: subscription.userId,
        addonId: addon._id,
        quantity: qty,
        reason: options.reason || null,
      },
    }).catch((err) =>
      logger.warn('[subscriptionLifecycle.grantExtraInvites] audit failed', {
        error: err?.message,
      })
    );

    const updatedSubscription = await Subscription.findById(subscription._id)
      .populate('planId');

    return {
      addon,
      subscription: updatedSubscription,
    };
  }

  async _resolvePlan(planOrCode) {
    if (!planOrCode) throw new ValidationError('planCode is required');
    if (typeof planOrCode === 'object' && planOrCode._id) return planOrCode;
    const plan = await Plan.getOrCreateByCode(planOrCode);
    if (!plan) throw new NotFoundError('Plan');
    if (!plan.isActive) throw new ValidationError('Plan is not active');
    return plan;
  }

  _assertPlanAssignableToUser(plan, user) {
    if (plan.availableFor === 'platform_admin') {
      throw new ValidationError('Platform admin plans cannot be assigned to users');
    }
    const expected = isBusinessUser(user) ? 'business' : 'host';
    if (plan.availableFor !== expected) {
      throw new ValidationError(`This plan is not available for ${expected} accounts`);
    }
  }

  _remainingInvites(subscriptions) {
    return subscriptions.reduce((sum, old) => {
      if (old.invitePool === null || old.invitePool === undefined) return sum;
      return sum + Math.max(
        0,
        (old.invitePool || 0) + (old.compensationPool || 0) - (old.invitesConsumed || 0)
      );
    }, 0);
  }

  async _resolveSubscriptionTarget(target) {
    if (target?.subscriptionId) {
      return Subscription.findById(target.subscriptionId).populate('planId');
    }
    if (target?.userId) {
      const active = await Subscription.findActiveForUser(target.userId);
      return active[0] || null;
    }
    return null;
  }

  async _auditChange({ userId, plan, subscription, existingActive, options, carried }) {
    await logAudit({
      action: 'subscription.plan_changed',
      actor: {
        _id: options.actor?._id || options.actor?.user || options.actor || userId,
        role: options.actor?.role || ROLES.HOST,
      },
      targetType: 'subscription',
      targetId: subscription._id,
      metadata: {
        userId,
        planCode: plan.code,
        replacedSubscriptionIds: existingActive.map((s) => String(s._id)),
        carriedInvites: carried,
        reason: options.reason || null,
      },
    }).catch((err) =>
      logger.warn('[subscriptionLifecycle.changePlan] audit failed', {
        subscriptionId: String(subscription._id),
        error: err?.message,
      })
    );
  }
}

module.exports = new SubscriptionLifecycleService();
