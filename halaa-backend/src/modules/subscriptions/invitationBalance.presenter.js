'use strict';

/**
 * Canonical Invitation Balance Calculator and Presenter (PR4 / F-11)
 *
 * One canonical invitation-balance contract across backend, web, and mobile.
 *
 * Canonical backend DTO:
 * invitationBalance: {
 *   unlimited: boolean,
 *   base: number | null,
 *   compensation: number | null,
 *   consumed: number,
 *   total: number | null,
 *   remaining: number | null
 * }
 */

const { COMPENSATION_PERCENTAGE, isUnlimited } = require('../../shared/constants/plans');
const AppError = require('../../shared/errors/AppError');

/**
 * Pure calculator that derives canonical invitation balance from subscription/plan data
 * or explicit numeric parameters.
 *
 * @param {Object|null} target - Subscription document, plain object, or explicit parameters
 * @param {Object|null} [optionalPlan] - Plan document/object if not populated on target
 * @returns {{
 *   unlimited: boolean,
 *   base: number | null,
 *   compensation: number | null,
 *   consumed: number,
 *   total: number | null,
 *   remaining: number | null
 * }}
 */
function calculateInvitationBalance(target, optionalPlan = null) {
  if (!target) {
    return {
      unlimited: false,
      base: 0,
      compensation: 0,
      consumed: 0,
      total: 0,
      remaining: 0,
    };
  }

  // Direct canonical DTO or explicit balance passed in
  if (
    typeof target === 'object' &&
    typeof target.unlimited === 'boolean' &&
    target.consumed !== undefined &&
    (target.base !== undefined || target.remaining !== undefined)
  ) {
    if (target.unlimited) {
      return {
        unlimited: true,
        base: null,
        compensation: null,
        consumed: Math.max(0, Number(target.consumed) || 0),
        total: null,
        remaining: null,
      };
    }
    const base = target.base != null ? Math.max(0, Number(target.base) || 0) : 0;
    const compensation =
      target.compensation != null
        ? Math.max(0, Number(target.compensation) || 0)
        : Math.floor((base * COMPENSATION_PERCENTAGE) / 100);
    const consumed = Math.max(0, Number(target.consumed) || 0);
    const total = target.total != null ? Math.max(0, Number(target.total) || 0) : base + compensation;
    const remaining =
      target.remaining != null
        ? Math.max(0, Number(target.remaining) || 0)
        : Math.max(0, total - consumed);
    return {
      unlimited: false,
      base,
      compensation,
      consumed,
      total,
      remaining,
    };
  }

  const plan =
    optionalPlan ||
    (typeof target.planId === 'object' && target.planId !== null
      ? target.planId
      : target.plan || null);

  const planType = target.planType || plan?.planType || null;
  const planCode = target.planCode || target.code || plan?.code || null;

  // Determine if this is an unlimited plan
  const isExplicitUnlimitedPlan =
    planType === 'unlimited' ||
    planCode === 'unlimited' ||
    plan?.isUnlimited === true ||
    target?.isUnlimited === true ||
    (target.invitePool === null && (plan?.invitePool === null || plan?.isUnlimited === true || planType === 'unlimited')) ||
    isUnlimited(target.invitePool) ||
    isUnlimited(plan?.invitePool) ||
    isUnlimited(plan?.invitesIncluded) ||
    isUnlimited(plan?.limits?.invitePool) ||
    isUnlimited(plan?.limits?.maxInvitesPerEvent);

  const consumed = Math.max(
    0,
    Number(
      target.invitesConsumed ??
        target.usedInvites ??
        target.usage?.guestsUsed ??
        0
    ) || 0
  );

  if (isExplicitUnlimitedPlan) {
    return {
      unlimited: true,
      base: null,
      compensation: null,
      consumed,
      total: null,
      remaining: null,
    };
  }

  // If invitePool is unpopulated on target, derive from plan
  let rawBase =
    target.invitePool !== undefined && target.invitePool !== null
      ? target.invitePool
      : (plan?.invitePool ??
        plan?.limits?.invitePool ??
        plan?.limits?.maxInvitesPerEvent ??
        target.limits?.invitePool ??
        target.limits?.maxInvitesPerEvent ??
        null);

  if (rawBase === null) {
    // If no plan limits and null invitePool, fail closed to 0
    rawBase = 0;
  }

  const base = Math.max(0, Number(rawBase) || 0);

  const rawCompensation =
    target.compensationPool !== undefined && target.compensationPool !== null
      ? target.compensationPool
      : (plan?.compensationPool !== undefined && plan?.compensationPool !== null
        ? plan.compensationPool
        : (base > 0 ? Math.floor((base * COMPENSATION_PERCENTAGE) / 100) : 0));

  const compensation = Math.max(0, Number(rawCompensation) || 0);
  const total = base + compensation;
  const remaining = Math.max(0, total - consumed);

  return {
    unlimited: false,
    base,
    compensation,
    consumed,
    total,
    remaining,
  };
}

/**
 * Validates that a subscription has sufficient invite balance for the requested count.
 * Throws AppError 402 INSUFFICIENT_INVITES if exceeded, or 400 ORPHAN_EVENT if missing.
 *
 * @param {Object|null} subscription
 * @param {number|Object|null} countOrPlan - Count or optional plan
 * @param {Object|number|null} [planOrCount] - Optional plan or count
 * @returns {{ allowed: boolean, balance: Object, remainingAfter: number|null }}
 */
function assertHasInviteBudget(subscription, countOrPlan, planOrCount = null) {
  let count;
  let plan;
  if (typeof countOrPlan === 'number') {
    count = countOrPlan;
    plan = planOrCount;
  } else {
    plan = countOrPlan;
    count = typeof planOrCount === 'number' ? planOrCount : 0;
  }

  if (!subscription) {
    throw new AppError('Event has no stamped subscription', 400, 'ORPHAN_EVENT');
  }

  const balance = calculateInvitationBalance(subscription, plan);
  if (balance.unlimited) {
    return {
      allowed: true,
      balance,
      remainingAfter: null,
    };
  }

  const remaining = balance.remaining || 0;
  if (count > remaining) {
    throw new AppError(
      `Insufficient invites: ${count} to send but ${remaining} remaining in your plan.`,
      402,
      'INSUFFICIENT_INVITES'
    );
  }

  return {
    allowed: true,
    balance,
    remainingAfter: remaining - count,
  };
}

module.exports = {
  calculateInvitationBalance,
  assertHasInviteBudget,
};
