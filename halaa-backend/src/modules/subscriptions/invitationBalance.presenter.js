'use strict';

/**
 * Canonical Invitation Balance Calculator and Presenter (PR4 / F-11)
 *
 * One canonical invitation-balance contract across backend, web, and mobile.
 *
 * Canonical backend DTO:
 * invitationBalance: {
 *   unlimited: boolean,
 *   base: number | null,          // plan invites + purchased extras
 *   planBase: number | null,      // invites the plan itself granted
 *   extra: number | null,         // purchased/granted extra-invite add-ons
 *   compensation: number | null,  // 15% bonus + any business carryover
 *   carried: number | null,       // business plan-change carryover only
 *   consumed: number,
 *   total: number | null,
 *   remaining: number | null
 * }
 *
 * `base`/`compensation` are running totals that add-ons and plan-change
 * carryover mutate. `planBase`/`extra`/`carried` split them back out so the
 * host can see where their invites came from, using the immutable
 * `planInvitePool` / `planCompensationPool` baselines stamped at creation.
 */

const { COMPENSATION_PERCENTAGE, isUnlimited } = require('../../shared/constants/plans');
const AppError = require('../../shared/errors/AppError');

/**
 * Split a running pool into "what the plan granted" and "what was added on
 * top". A missing baseline means nothing is known to have been added, so the
 * whole pool reads as plan-granted — never as a negative extra.
 *
 * @param {number} current - running total (invitePool / compensationPool)
 * @param {number|null|undefined} baseline - stamped plan baseline
 * @returns {{ planBase: number, extra: number }}
 */
function splitPool(current, baseline) {
  const total = Math.max(0, Number(current) || 0);
  if (baseline === null || baseline === undefined || !Number.isFinite(Number(baseline))) {
    return { planBase: total, extra: 0 };
  }
  const planBase = Math.min(total, Math.max(0, Number(baseline) || 0));
  return { planBase, extra: total - planBase };
}

/**
 * Pure calculator that derives canonical invitation balance from subscription/plan data
 * or explicit numeric parameters.
 *
 * @param {Object|null} target - Subscription document, plain object, or explicit parameters
 * @param {Object|null} [optionalPlan] - Plan document/object if not populated on target
 * @returns {{
 *   unlimited: boolean,
 *   base: number | null,
 *   planBase: number | null,
 *   extra: number | null,
 *   compensation: number | null,
 *   carried: number | null,
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
      planBase: 0,
      extra: 0,
      compensation: 0,
      carried: 0,
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
        planBase: null,
        extra: null,
        compensation: null,
        carried: null,
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
    // A DTO carries the already-split values, not the baselines, so they are
    // read back directly. Missing ones mean the whole allowance is
    // plan-granted rather than inventing extras.
    const { planBase, extra } = splitPool(base, target.planBase);
    const carried =
      target.carried != null
        ? Math.min(compensation, Math.max(0, Number(target.carried) || 0))
        : 0;
    return {
      unlimited: false,
      base,
      planBase,
      extra,
      compensation,
      carried,
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
      planBase: null,
      extra: null,
      compensation: null,
      carried: null,
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

  // Baselines are stamped on the subscription at creation. Fall back to the
  // plan's own limits so subscriptions created before the baseline existed
  // still split correctly.
  const baseBaseline =
    target.planInvitePool ?? plan?.limits?.invitePool ?? plan?.invitePool ?? null;
  const compensationBaseline =
    target.planCompensationPool ??
    (baseBaseline != null
      ? Math.floor((Math.max(0, Number(baseBaseline) || 0) * COMPENSATION_PERCENTAGE) / 100)
      : null);

  const { planBase, extra } = splitPool(base, baseBaseline);
  const { extra: carried } = splitPool(compensation, compensationBaseline);

  return {
    unlimited: false,
    base,
    planBase,
    extra,
    compensation,
    carried,
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
