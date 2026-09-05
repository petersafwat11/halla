/**
 * Status Constants
 * All status values used across the application
 * @module shared/constants/status
 */

/**
 * User account status
 */
const USER_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  REJECTED: 'rejected',
  INACTIVE: 'inactive',
  // Account closed (self-service deletion or admin removal). Previously
  // referenced by admin services but never defined here, so `USER_STATUS.DELETED`
  // was `undefined` and `user.save()` threw a status-enum ValidationError.
  DELETED: 'deleted',
};

/**
 * Vendor application status
 */
const VENDOR_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
};

/**
 * Event status
 *
 * `failed`: set by the launch-retry cron
 * after `maxAttempts` retries OR when the 24h pre-launch retry window
 * expires without a successful bulk send. The host (or admin) can flip
 * the event back to `scheduled` via the manual-retry endpoint, which
 * resets `attemptCount` to 0.
 */
const EVENT_STATUS = {
  PENDING_SCHEDULING: 'pending_scheduling',
  PENDING_REVIEW: 'pending_review',
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  PUBLISHED: 'published',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
  FAILED: 'failed',
  DELETED: 'deleted',
};

/**
 * Subscription status
 */
const SUBSCRIPTION_STATUS = {
  TRIAL: 'trial',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  PENDING: 'pending',
  SUSPENDED: 'suspended',
};

/**
 * Ticket status
 */
const TICKET_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  WAITING_RESPONSE: 'waiting_response',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
};

/**
 * Ticket priority
 */
const TICKET_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

/**
 * Guest RSVP status
 */
const RSVP_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  DECLINED: 'declined',
};

/**
 * Canonical RSVP Buckets (EVT-16 root cause resolution)
 * Maps all variations of guest states to authoritative reporting buckets.
 */
const RSVP_BUCKETS = Object.freeze({
  PENDING: Object.freeze(['invited', 'pending']),
  CONFIRMED: Object.freeze(['confirmed', 'checked_in']),
  DECLINED: Object.freeze(['declined']),
  ATTENDED: Object.freeze(['checked_in']),
  NO_SHOW: Object.freeze(['no_show']),
});

/**
 * Classifies any guest status string into a canonical RSVP bucket:
 * 'pending' | 'confirmed' | 'declined' | 'attended' | 'no_show'
 */
const classifyRsvpBucket = (status) => {
  if (!status) return 'pending';
  const s = String(status).toLowerCase().trim();
  if (RSVP_BUCKETS.ATTENDED.includes(s)) return 'attended';
  if (RSVP_BUCKETS.CONFIRMED.includes(s)) return 'confirmed';
  if (RSVP_BUCKETS.DECLINED.includes(s)) return 'declined';
  if (RSVP_BUCKETS.NO_SHOW.includes(s)) return 'no_show';
  if (RSVP_BUCKETS.PENDING.includes(s)) return 'pending';
  return 'pending';
};

/**
 * Invitation type — chosen by the host in create-event Step 4. Encodes two
 * independent dimensions in one enum: whether the guest can reply
 * (confirm/decline) and whether confirmation sends a QR entry code.
 *
 *   REPLY_AND_QR (01): reply buttons + QR entry code   (default = legacy behavior)
 *   REPLY_ONLY   (02): reply buttons, no QR
 *   NONE         (03): neither — a plain informational invitation
 *
 * "Reply" gates the WhatsApp button webhook AND the web RSVP portal.
 * "QR" gates the entry-pass QR (auto-reply image on confirm, and the portal
 * pass). Whether the WhatsApp message physically renders reply buttons is a
 * property of the selected Meta template, not this flag — this flag is
 * authoritative for our own gating + QR delivery only.
 */
const INVITATION_TYPE = {
  REPLY_AND_QR: 'reply_and_qr',
  REPLY_ONLY: 'reply_only',
  NONE: 'none',
};

/** True when the invitation type lets guests reply (confirm/decline). */
const invitationAllowsReply = (type) =>
  type === INVITATION_TYPE.REPLY_AND_QR || type === INVITATION_TYPE.REPLY_ONLY;

/** True when the invitation type includes a QR entry code for the guest. */
const invitationIncludesQr = (type) =>
  type === INVITATION_TYPE.REPLY_AND_QR;

/**
 * Guest check-in status
 */
const CHECKIN_STATUS = {
  NOT_CHECKED_IN: 'not_checked_in',
  CHECKED_IN: 'checked_in',
  NO_SHOW: 'no_show',
};

/**
 * Notification status
 */
const NOTIFICATION_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  READ: 'read',
};

// Payment status enum lives on the PaymentModel as a static
// (`Payment.PAYMENT_STATUS`) — the single source of truth with the
// full lifecycle (pending | pending_3ds | authorized | paid | captured
// | failed | refunded | partially_refunded | voided).

/**
 * Service status
 */
const SERVICE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DISABLED: 'disabled',
};

/**
 * WhatsApp template status
 */
const WHATSAPP_TEMPLATE_STATUS = {
  NOT_SUBMITTED: 'not_submitted',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PAUSED: 'paused',
  DISABLED: 'disabled',
};

/**
 * Supervisor status
 */
const SUPERVISOR_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};

/**
 * Guest status
 */
const GUEST_STATUS = {
  INVITED: 'invited',
  CONFIRMED: 'confirmed',
  DECLINED: 'declined',
  CHECKED_IN: 'checked_in',
  NO_SHOW: 'no_show',
};

/**
 * Ticket source - who created the ticket
 */
const TICKET_SOURCE = {
  HOST: 'host',
  GUEST: 'guest',
  VENDOR: 'vendor',
  SYSTEM: 'system',
};

/**
 * Rate limiting configuration
 */
const RATE_LIMIT = {
  API: { WINDOW_MS: 15 * 60 * 1000, MAX_REQUESTS: 100 },
  AUTH: { WINDOW_MS: 60 * 60 * 1000, MAX_REQUESTS: 10 },
  OTP: { WINDOW_MS: 60 * 1000, MAX_REQUESTS: 1, HOURLY_WINDOW_MS: 60 * 60 * 1000, HOURLY_MAX: 5 },
  WEBHOOK: { WINDOW_MS: 60 * 1000, MAX_REQUESTS: 30 },
  PASSWORD_RESET: { WINDOW_MS: 60 * 60 * 1000, MAX_REQUESTS: 3 },
};

const EVENT_TRANSITIONS = Object.freeze({
  [EVENT_STATUS.PENDING_SCHEDULING]: Object.freeze([
    EVENT_STATUS.SCHEDULED,
    EVENT_STATUS.CANCELLED,
    EVENT_STATUS.DELETED,
  ]),
  [EVENT_STATUS.PENDING_REVIEW]: Object.freeze([
    EVENT_STATUS.PENDING_SCHEDULING,
    EVENT_STATUS.SCHEDULED,
    EVENT_STATUS.CANCELLED,
    EVENT_STATUS.DELETED,
  ]),
  [EVENT_STATUS.SCHEDULED]: Object.freeze([
    EVENT_STATUS.LIVE,
    EVENT_STATUS.PUBLISHED,
    EVENT_STATUS.COMPLETED,
    EVENT_STATUS.CANCELLED,
    EVENT_STATUS.DELETED,
  ]),
  [EVENT_STATUS.LIVE]: Object.freeze([
    EVENT_STATUS.COMPLETED,
    EVENT_STATUS.CANCELLED,
    EVENT_STATUS.DELETED,
  ]),
  [EVENT_STATUS.PUBLISHED]: Object.freeze([
    EVENT_STATUS.LIVE,
    EVENT_STATUS.COMPLETED,
    EVENT_STATUS.CANCELLED,
    EVENT_STATUS.DELETED,
  ]),
  [EVENT_STATUS.COMPLETED]: Object.freeze([
    EVENT_STATUS.SCHEDULED,
    EVENT_STATUS.ARCHIVED,
    EVENT_STATUS.DELETED,
  ]),
  [EVENT_STATUS.CANCELLED]: Object.freeze([
    EVENT_STATUS.SCHEDULED,
    EVENT_STATUS.PENDING_SCHEDULING,
    EVENT_STATUS.ARCHIVED,
    EVENT_STATUS.DELETED,
  ]),
  [EVENT_STATUS.FAILED]: Object.freeze([
    EVENT_STATUS.SCHEDULED,
    EVENT_STATUS.CANCELLED,
    EVENT_STATUS.DELETED,
  ]),
  [EVENT_STATUS.ARCHIVED]: Object.freeze([
    EVENT_STATUS.DELETED,
  ]),
  [EVENT_STATUS.DELETED]: Object.freeze([]),
});

const isValidEventStatusTransition = (fromStatus, toStatus) => {
  if (!fromStatus || !toStatus) return false;
  if (fromStatus === toStatus) return true; // idempotent
  const allowed = EVENT_TRANSITIONS[fromStatus];
  return Array.isArray(allowed) && allowed.includes(toStatus);
};

/**
 * Valid ticket status transitions (state machine)
 */
const TICKET_TRANSITIONS = Object.freeze({
  [TICKET_STATUS.OPEN]: Object.freeze([
    TICKET_STATUS.IN_PROGRESS,
    TICKET_STATUS.RESOLVED,
    TICKET_STATUS.CLOSED,
  ]),
  [TICKET_STATUS.IN_PROGRESS]: Object.freeze([
    TICKET_STATUS.WAITING_RESPONSE,
    TICKET_STATUS.RESOLVED,
    TICKET_STATUS.CLOSED,
  ]),
  [TICKET_STATUS.WAITING_RESPONSE]: Object.freeze([
    TICKET_STATUS.IN_PROGRESS,
    TICKET_STATUS.RESOLVED,
    TICKET_STATUS.CLOSED,
  ]),
  [TICKET_STATUS.RESOLVED]: Object.freeze([
    TICKET_STATUS.IN_PROGRESS,
    TICKET_STATUS.OPEN,
    TICKET_STATUS.CLOSED,
  ]),
  [TICKET_STATUS.CLOSED]: Object.freeze([]),
});

const isValidTicketStatusTransition = (fromStatus, toStatus) => {
  if (!fromStatus || !toStatus) return false;
  if (fromStatus === toStatus) return true; // idempotent
  const allowed = TICKET_TRANSITIONS[fromStatus];
  return Array.isArray(allowed) && allowed.includes(toStatus);
};

/**
 * Valid custom design fulfillment transitions (PR6 / F-12)
 */
const DESIGN_FULFILLMENT_STATUS = Object.freeze({
  PAID: 'paid',
  QUEUED: 'queued',
  IN_PROGRESS: 'in_progress',
  FULFILLED: 'fulfilled',
});

const DESIGN_FULFILLMENT_TRANSITIONS = Object.freeze({
  [DESIGN_FULFILLMENT_STATUS.PAID]: Object.freeze([
    DESIGN_FULFILLMENT_STATUS.QUEUED,
  ]),
  [DESIGN_FULFILLMENT_STATUS.QUEUED]: Object.freeze([
    DESIGN_FULFILLMENT_STATUS.IN_PROGRESS,
  ]),
  [DESIGN_FULFILLMENT_STATUS.IN_PROGRESS]: Object.freeze([
    DESIGN_FULFILLMENT_STATUS.FULFILLED,
  ]),
  [DESIGN_FULFILLMENT_STATUS.FULFILLED]: Object.freeze([]),
});

const isValidDesignFulfillmentTransition = (fromStatus, toStatus) => {
  if (!fromStatus || !toStatus) return false;
  if (fromStatus === toStatus) return true; // idempotent
  const allowed = DESIGN_FULFILLMENT_TRANSITIONS[fromStatus];
  return Array.isArray(allowed) && allowed.includes(toStatus);
};

const getNextFulfillmentStatus = (currentStatus) => {
  const allowed = DESIGN_FULFILLMENT_TRANSITIONS[currentStatus];
  if (Array.isArray(allowed) && allowed.length > 0) {
    return allowed[0];
  }
  return null;
};

const EVENT_LIFECYCLE_ALLOWED = Object.freeze({
  SCHEDULE: Object.freeze([EVENT_STATUS.PENDING_SCHEDULING, EVENT_STATUS.SCHEDULED]),
  TEST_MESSAGE: Object.freeze([EVENT_STATUS.PENDING_SCHEDULING, EVENT_STATUS.SCHEDULED]),
  MANUAL_LAUNCH_RETRY: Object.freeze([EVENT_STATUS.SCHEDULED, EVENT_STATUS.FAILED]),
  INTERNAL_PARTIAL_DELIVERY_RETRY: Object.freeze([EVENT_STATUS.LIVE]),
  LIVE_SEND: Object.freeze([EVENT_STATUS.LIVE]),
  POST_EVENT_DRAFT_MUTATION: Object.freeze([
    EVENT_STATUS.PENDING_SCHEDULING,
    EVENT_STATUS.PENDING_REVIEW,
    EVENT_STATUS.SCHEDULED,
    EVENT_STATUS.LIVE,
    EVENT_STATUS.COMPLETED,
  ]),
  POST_EVENT_PUBLISH: Object.freeze([EVENT_STATUS.COMPLETED]),
  POST_EVENT_NOTIFY: Object.freeze([EVENT_STATUS.COMPLETED]),
  POST_EVENT_UNPUBLISH: Object.freeze([EVENT_STATUS.COMPLETED]),
  STAFF_NOTIFY: Object.freeze([EVENT_STATUS.SCHEDULED, EVENT_STATUS.LIVE]),
  STAFF_MUTATION: Object.freeze([
    EVENT_STATUS.PENDING_SCHEDULING,
    EVENT_STATUS.PENDING_REVIEW,
    EVENT_STATUS.SCHEDULED,
    EVENT_STATUS.LIVE,
  ]),
  DETAILS_MUTATION: Object.freeze([
    EVENT_STATUS.PENDING_SCHEDULING,
    EVENT_STATUS.PENDING_REVIEW,
    EVENT_STATUS.SCHEDULED,
  ]),
  INVITATION_SETTINGS_MUTATION: Object.freeze([
    EVENT_STATUS.PENDING_SCHEDULING,
    EVENT_STATUS.PENDING_REVIEW,
    EVENT_STATUS.SCHEDULED,
  ]),
});

module.exports = {
  USER_STATUS,
  VENDOR_STATUS,
  EVENT_STATUS,
  EVENT_STATUS_VALUES: Object.values(EVENT_STATUS),
  EVENT_TRANSITIONS,
  isValidEventStatusTransition,
  EVENT_LIFECYCLE_ALLOWED,
  TICKET_TRANSITIONS,
  isValidTicketStatusTransition,
  DESIGN_FULFILLMENT_STATUS,
  DESIGN_FULFILLMENT_TRANSITIONS,
  isValidDesignFulfillmentTransition,
  getNextFulfillmentStatus,
  SUBSCRIPTION_STATUS,
  TICKET_STATUS,
  TICKET_PRIORITY,
  RSVP_STATUS,
  RSVP_BUCKETS,
  classifyRsvpBucket,
  INVITATION_TYPE,
  INVITATION_TYPE_VALUES: Object.values(INVITATION_TYPE),
  invitationAllowsReply,
  invitationIncludesQr,
  CHECKIN_STATUS,
  NOTIFICATION_STATUS,
  SERVICE_STATUS,
  WHATSAPP_TEMPLATE_STATUS,
  SUPERVISOR_STATUS,
  GUEST_STATUS,
  TICKET_SOURCE,
  RATE_LIMIT,
};
