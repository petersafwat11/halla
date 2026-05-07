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
 * `failed` (PIPELINE-F04 / FLOW-15-F01): set by the launch-retry cron
 * after `maxAttempts` retries OR when the 24h pre-launch retry window
 * expires without a successful bulk send. The host (or admin) can flip
 * the event back to `scheduled` via the manual-retry endpoint, which
 * resets `attemptCount` to 0.
 */
const EVENT_STATUS = {
  DRAFT: 'draft',
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
// | failed | refunded | partially_refunded | voided). The legacy
// constant in this file was unused and has been removed (§15.3).

/**
 * Whitelabel application status
 */
const WHITELABEL_APPLICATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

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
  WHITELABEL: 'whitelabel',
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
  CHECKIN_STATUS,
  NOTIFICATION_STATUS,
  WHITELABEL_APPLICATION_STATUS,
  SERVICE_STATUS,
  WHATSAPP_TEMPLATE_STATUS,
  SUPERVISOR_STATUS,
  GUEST_STATUS,
  TICKET_SOURCE,
  RATE_LIMIT,
};
