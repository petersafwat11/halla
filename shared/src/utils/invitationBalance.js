/**
 * Invitation-balance display helpers — platform-pure (no `react-native`,
 * `next/*`, or DOM access). Shared by web and mobile so the host, admin and
 * business surfaces agree on what an invite balance means and when more
 * invites can be bought.
 *
 * Canonical balance DTO (backend `invitationBalance.presenter`):
 *   { unlimited, base, planBase, extra, compensation, carried,
 *     consumed, total, remaining }
 */

import { EVENT_STATUS_GROUPS } from "../constants/eventStatus.js";

/** Subscription statuses that can still receive purchased invites. */
const PURCHASABLE_SUBSCRIPTION_STATUSES = ["active"];

/**
 * True when the subscription has run past its end date. Status alone is not
 * enough: a subscription stays `active` in the database until a cron sweeps
 * it, so an expired-but-unswept row would otherwise still offer a top-up.
 */
const hasExpired = (subscription) => {
  // `isActive` is the backend's own combined status+expiry verdict; trust it
  // when the payload carries it.
  if (typeof subscription?.isActive === "boolean") return !subscription.isActive;
  const expiresAt = subscription?.expiresAt;
  if (!expiresAt) return false;
  const end = new Date(expiresAt).getTime();
  return Number.isFinite(end) && end <= Date.now();
};

/**
 * True when the subscription is the free trial rather than a bought plan.
 * The trial is not a purchasable plan and must never render as one.
 */
export const isTrialSubscription = (subscription) => {
  if (!subscription) return false;
  return (
    subscription.status === "trial" ||
    subscription.planType === "trial" ||
    subscription.planCode === "trial" ||
    subscription.planId?.planType === "trial" ||
    subscription.isInTrial === true
  );
};

/** True when the event has reached a terminal state (ended, cancelled, …). */
export const isEventTerminal = (event) => {
  const status = typeof event === "string" ? event : event?.status;
  if (!status) return false;
  return EVENT_STATUS_GROUPS.TERMINAL.includes(status);
};

/**
 * Whether the "Add more invites" affordance should be offered.
 *
 * Hidden when buying invites cannot help:
 *  - the balance is unlimited — there is nothing to top up;
 *  - the account is on the free trial — the trial is not a purchasable plan,
 *    the host must buy a real plan first;
 *  - the subscription is not active (cancelled / past due) or has run past
 *    its end date — the top-up would land on a pool the host cannot send from;
 *  - the event has ended, been cancelled or archived — no further sends;
 *  - a per-event plan has already started sending (`firstSendAt`), so the
 *    plan is spent and extra invites cannot be used on it.
 *
 * @param {Object} params
 * @param {Object} [params.balance] - canonical invitationBalance DTO
 * @param {Object} [params.subscription] - subscription summary DTO
 * @param {Object|string} [params.event] - event (or its status string)
 * @returns {boolean}
 */
export const canPurchaseMoreInvites = ({ balance, subscription, event } = {}) => {
  if (balance?.unlimited) return false;
  if (isTrialSubscription(subscription)) return false;

  if (subscription?.status && !PURCHASABLE_SUBSCRIPTION_STATUSES.includes(subscription.status)) {
    return false;
  }
  if (hasExpired(subscription)) return false;

  if (event && isEventTerminal(event)) return false;

  // Per-event plans are spent the moment sending starts — topping them up
  // buys invites the host cannot spend on this event.
  // `isPoolPlan` is the events subscription-info spelling, `isPoolSubscription`
  // the subscription-summary one; either may be the only key present.
  const isPerEvent =
    subscription?.isSingleEvent === true ||
    subscription?.isPoolPlan === false ||
    subscription?.isPoolSubscription === false;
  if (isPerEvent && subscription?.firstSendAt) return false;

  return true;
};

/**
 * Break a balance into the rows the "current plan" cards render, dropping
 * anything that is zero so the card never shows an empty line.
 *
 * @param {Object} balance - canonical invitationBalance DTO
 * @returns {Array<{ key: string, value: number }>}
 */
export const getInviteBreakdown = (balance) => {
  if (!balance || balance.unlimited) return [];
  const carried = balance.carried ?? 0;
  const rows = [
    { key: "planInvites", value: balance.planBase ?? balance.base ?? 0 },
    { key: "extraInvites", value: balance.extra ?? 0 },
    // `compensation` is the running total; `carried` is the slice of it that
    // came from a replaced business plan, so it is subtracted out here to keep
    // the rows additive rather than double-counted.
    { key: "compensationInvites", value: Math.max(0, (balance.compensation ?? 0) - carried) },
    { key: "carriedInvites", value: carried },
  ];
  // The plan row always shows (even at 0) so the card has an anchor; the
  // optional rows only appear once the host actually has some.
  return rows.filter((row, index) => index === 0 || row.value > 0);
};

export default {
  isTrialSubscription,
  isEventTerminal,
  canPurchaseMoreInvites,
  getInviteBreakdown,
};
