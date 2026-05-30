/**
 * Cross-app presentation helpers for notification rendering.
 *
 * Both apps render the same notification payload coming off
 * `/notifications` — same icon set (lucide-name strings), same priority
 * palette, same "time ago" tokens. These three helpers were duplicated
 * verbatim in `labbe/services/notification.js` and
 * `halla-mobile/services/notificationService.js`; they now live here.
 */

/**
 * Render a `Date | string` as a coarse "time ago" string. Returns
 * English tokens; localised variants belong with the i18n layer (this
 * helper is shape-only).
 *
 * @param {string|Date} date
 * @returns {string}
 */
export function formatTimeAgo(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}

const NOTIFICATION_ICON_MAP = {
  // Event
  event_created: "calendar-plus",
  event_reminder: "bell",
  event_status_change: "calendar-check",
  event_completed: "check-circle",
  event_cancelled: "calendar-x",

  // Guest
  guest_rsvp_accepted: "user-check",
  guest_rsvp_declined: "user-x",
  guest_rsvp_maybe: "user-question",
  guest_checked_in: "scan",
  invitations_sent: "send",

  // Subscription
  subscription_expiring: "clock",
  subscription_renewed: "refresh-cw",
  subscription_expired: "alert-circle",
  plan_limit_warning: "alert-triangle",
  payment_successful: "credit-card",
  payment_failed: "x-circle",

  // User
  user_registered: "user-plus",
  vendor_pending_approval: "user-clock",
  vendor_approved: "badge-check",
  vendor_rejected: "user-minus",
  whitelabel_registered: "building",
  profile_incomplete: "user-edit",
  welcome: "sparkles",

  // Support
  ticket_created: "ticket",
  ticket_assigned: "user-check",
  ticket_response: "message-circle",
  ticket_resolved: "check-square",

  // Admin
  system_alert: "alert-octagon",
  revenue_report: "bar-chart",
  usage_report: "activity",

  // Vendor
  service_inquiry: "help-circle",
  service_booking: "calendar",
  new_review: "star",
  service_views_milestone: "eye",

  // General
  announcement: "megaphone",
  custom: "bell",
};

/**
 * Map a notification `type` to a lucide icon name. Unknown types fall
 * back to `"bell"`.
 *
 * @param {string} type
 * @returns {string}
 */
export function getNotificationIcon(type) {
  return NOTIFICATION_ICON_MAP[type] || "bell";
}

const NOTIFICATION_PRIORITY_COLOR_MAP = {
  low: "#6B7280",
  normal: "#3B82F6",
  high: "#F59E0B",
  urgent: "#EF4444",
};

/**
 * Map a notification `priority` (low|normal|high|urgent) to a hex
 * colour. Unknown priorities fall back to the `normal` colour.
 *
 * @param {string} priority
 * @returns {string}
 */
export function getPriorityColor(priority) {
  return NOTIFICATION_PRIORITY_COLOR_MAP[priority] || NOTIFICATION_PRIORITY_COLOR_MAP.normal;
}
