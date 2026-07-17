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
  MAYBE: 'maybe',
};

/**
 * Invitation type — chosen by the host in create-event Step 4. Encodes two
 * independent dimensions in one enum: whether the guest can reply
 * (accept/decline/maybe) and whether they receive a QR entry code.
 *
 *   REPLY_AND_QR (01): reply buttons + QR entry code   (default = legacy behavior)
 *   REPLY_ONLY   (02): reply buttons, no QR
 *   QR_ONLY      (03): QR entry code, no reply
 *   NONE         (04): neither — a plain informational invitation
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
  QR_ONLY: 'qr_only',
  NONE: 'none',
};

/** True when the invitation type lets guests reply (accept/decline/maybe). */
const invitationAllowsReply = (type) =>
  type === INVITATION_TYPE.REPLY_AND_QR || type === INVITATION_TYPE.REPLY_ONLY;

/** True when the invitation type includes a QR entry code for the guest. */
const invitationIncludesQr = (type) =>
  type === INVITATION_TYPE.REPLY_AND_QR || type === INVITATION_TYPE.QR_ONLY;

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
  MAYBE: 'maybe',
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

module.exports = {
  USER_STATUS,
  VENDOR_STATUS,
  EVENT_STATUS,
  SUBSCRIPTION_STATUS,
  TICKET_STATUS,
  TICKET_PRIORITY,
  RSVP_STATUS,
  INVITATION_TYPE,
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
