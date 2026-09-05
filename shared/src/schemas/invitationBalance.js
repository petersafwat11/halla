/**
 * Canonical Invitation Balance Schema and Calculator (PR4 / F-11)
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
import { z } from "zod";
import { COMPENSATION_PERCENTAGE, isUnlimited } from "../constants/plans.js";

export const invitationBalanceSchema = z
  .object({
    unlimited: z.boolean(),
    base: z.number().int().nonnegative().nullable(),
    compensation: z.number().int().nonnegative().nullable(),
    consumed: z.number().int().nonnegative(),
    total: z.number().int().nonnegative().nullable(),
    remaining: z.number().int().nonnegative().nullable(),
  })
  .strict();

/**
 * Pure calculator that derives canonical invitation balance from subscription/plan data
 * or explicit numeric parameters.
 *
 * @param {Object|null} target - Subscription object, DTO, or explicit parameters
 * @param {Object|null} [optionalPlan] - Plan object if not already populated on target.planId
 * @returns {{
 *   unlimited: boolean,
 *   base: number | null,
 *   compensation: number | null,
 *   consumed: number,
 *   total: number | null,
 *   remaining: number | null
 * }}
 */
export function calculateInvitationBalance(target, optionalPlan = null) {
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
    typeof target === "object" &&
    typeof target.unlimited === "boolean" &&
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
    (typeof target.planId === "object" && target.planId !== null
      ? target.planId
      : target.plan || null);

  const planType = target.planType || plan?.planType || null;
  const planCode = target.planCode || target.code || plan?.code || null;

  // Determine if this is an unlimited plan
  const isExplicitUnlimitedPlan =
    planType === "unlimited" ||
    planCode === "unlimited" ||
    isUnlimited(target.invitePool) ||
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

  // If invitePool is explicitly null on a non-unlimited plan, derive from plan limits (or fail closed to 0 if orphaned)
  let rawBase =
    target.invitePool !== undefined && target.invitePool !== null
      ? target.invitePool
      : (plan?.limits?.invitePool ??
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
      : (base > 0 ? Math.floor((base * COMPENSATION_PERCENTAGE) / 100) : 0);

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
