/**
 * Centralized Dispatch-Policy Gate (business-account plan #11/#dispatch).
 *
 * ONE guard consulted before EVERY send path (initial / retry / resend /
 * reminder / cron). Replaces ad-hoc per-endpoint checks. Returns a structured
 * decision so callers can log a precise skip reason instead of silently
 * dispatching.
 *
 * Checks:
 *   - owner active / not soft-deleted / not suspended
 *   - a subscription exists, is owned by the event host, is active & unexpired
 *   - event is non-terminal (not cancelled/completed/deleted)
 *   - the subscription/assignment is not under refund
 *   - invite availability (pool not exhausted)
 *
 * @module modules/messaging/messaging.dispatchPolicy.service
 */

const User = require('../../../models/UserModel');
const BusinessPlanAssignment = require('../../../models/BusinessPlanAssignmentModel');
const { ASSIGNMENT_STATUS } = require('../../../models/BusinessPlanAssignmentModel');
const { USER_STATUS, SUBSCRIPTION_STATUS } = require('../../shared/constants');
const logger = require('../../shared/utils/logger');
const subscriptionEventAccess = require('../subscriptions/subscriptionEventAccess.service');

const TERMINAL_EVENT_STATUSES = ['cancelled', 'completed', 'deleted', 'archived'];

/**
 * @param {Object} event - Event doc (needs host, status, subscriptionId)
 * @param {Object} [opts]
 * @param {boolean} [opts.requireInvites] - also require non-exhausted pool
 * @returns {Promise<{ allowed: boolean, reason?: string }>}
 */
async function canDispatch(event, opts = {}) {
  if (!event) return deny('no_event');

  // Event must be non-terminal.
  if (TERMINAL_EVENT_STATUSES.includes(event.status)) {
    return deny(`event_terminal:${event.status}`);
  }

  // `event.host` may be a populated User doc (resend/reminder paths load it with
  // .populate("host", ...)) OR a raw ObjectId. Normalize to the id so lookups
  // and the owner comparison don't false-mismatch a populated doc (whose
  // String() is not an id) against an id string.
  const hostId = event.host && event.host._id ? event.host._id : event.host;

  // Owner must be active and not soft-deleted/suspended.
  const owner = await User.findById(hostId).select(
    'status deletedAt accountType subscription'
  );
  if (!owner) return deny('owner_missing');
  if (owner.deletedAt) return deny('owner_deleted');
  if (owner.status === USER_STATUS.SUSPENDED) return deny('owner_suspended');
  if (owner.status === USER_STATUS.INACTIVE) return deny('owner_inactive');

  // Subscription must exist, belong to the host, and be usable for this event.
  // Replaced subscriptions are not available for new event creation, but an
  // event that already points at one may still spend that event-owned pool.
  const sub = await subscriptionEventAccess.findForEvent(event, hostId);

  if (!sub) return deny('no_active_subscription');
  if (String(sub.userId) !== String(hostId)) return deny('subscription_owner_mismatch');
  if (
    ![SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL].includes(sub.status) &&
    !subscriptionEventAccess.isReplacedSubscriptionForEvent(sub, event)
  ) {
    return deny(`subscription_status:${sub.status}`);
  }
  if (sub.expiresAt && new Date(sub.expiresAt).getTime() < Date.now()) {
    return deny('subscription_expired');
  }

  // Not under refund (business assignment in a refund/failed state).
  const underRefund = await BusinessPlanAssignment.findOne({
    businessUserId: hostId,
    subscriptionId: sub._id,
    status: { $in: [ASSIGNMENT_STATUS.REFUND_PENDING, ASSIGNMENT_STATUS.ACTIVATION_FAILED] },
  }).select('_id');
  if (underRefund) return deny('assignment_under_refund');

  // Invite availability (optional). `invitesRemaining` is a virtual:
  // null = unlimited pool, otherwise base+compensation−consumed.
  if (opts.requireInvites) {
    const remaining = sub.invitesRemaining;
    if (remaining !== null && remaining !== undefined && remaining <= 0) {
      return deny('invites_exhausted');
    }
  }

  return { allowed: true };
}

function deny(reason) {
  return { allowed: false, reason };
}

/**
 * Convenience wrapper that logs the skip reason for cron/bulk paths.
 */
async function assertCanDispatch(event, context = {}, opts = {}) {
  const decision = await canDispatch(event, opts);
  if (!decision.allowed) {
    logger.warn('[dispatch-policy] send blocked', {
      eventId: event?._id ? String(event._id) : null,
      reason: decision.reason,
      ...context,
    });
  }
  return decision;
}

module.exports = { canDispatch, assertCanDispatch, TERMINAL_EVENT_STATUSES };
