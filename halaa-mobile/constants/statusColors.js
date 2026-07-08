/**
 * statusColors — single source of truth for status-badge colors (MOBILE).
 *
 * Mirror of halaa-web/utils/statusColors.js — the two files MUST keep identical
 * tone hexes and the identical status→tone map so a given status shows the
 * SAME color on web and mobile.
 *
 * Status vocabulary is grounded in the backend single source of truth:
 *   halaa-backend/src/shared/constants/status.js  (+ PaymentModel.PAYMENT_STATUS)
 *
 * Usage:
 *   import { getStatusVisual } from "../constants/statusColors";
 *   const { fg, bg } = getStatusVisual("confirmed");            // guest RSVP
 *   const { fg, bg } = getStatusVisual("completed", "payment"); // domain override
 */

// ── Semantic tones: explicit (fg, bg) pairs ─────────────────────────────────
export const STATUS_TONES = {
  success: { fg: "#2A8C5B", bg: "#EAF4EF" }, // positive / done-well / live / paid / approved
  warning: { fg: "#D38200", bg: "#FBF3E6" }, // awaiting action / pending / maybe
  danger: { fg: "#C0392B", bg: "#F9EBEA" }, // failed / declined / cancelled / rejected / suspended / expired
  info: { fg: "#3498DB", bg: "#E8F4FD" }, // in-progress / scheduled / sent
  neutral: { fg: "#656565", bg: "#F2F2F2" }, // inert / closed / completed / inactive / archived
  purple: { fg: "#9B59B6", bg: "#F5EEF8" }, // trial / waiting-on-other-party
  indigo: { fg: "#4338CA", bg: "#EEF2FF" }, // checked-in (physically present)
};

// ── Base status → tone map (covers every backend vocabulary + display aliases) ─
const BASE_TONE = {
  // Events
  pending_scheduling: "warning",
  pending_review: "warning",
  scheduled: "info",
  live: "success",
  published: "success",
  completed: "neutral",
  archived: "neutral",
  cancelled: "danger",
  failed: "danger",
  deleted: "neutral",
  draft: "neutral", // display alias
  ended: "neutral", // display alias

  // Guest / RSVP
  invited: "neutral",
  pending: "warning",
  confirmed: "success",
  attended: "success",
  declined: "danger",
  maybe: "warning",
  checked_in: "indigo",
  no_show: "neutral",

  // Payment lifecycle
  pending_3ds: "warning",
  authorized: "info",
  paid: "success",
  captured: "success",
  refunded: "info",
  partially_refunded: "info",
  voided: "neutral",

  // Subscription
  trial: "purple",
  past_due: "warning",
  expired: "danger",

  // Business sub-assignment
  pending_payment: "warning",
  payment_processing: "info",
  activation_failed: "danger",

  // Tickets
  open: "warning",
  in_progress: "info",
  waiting_response: "purple",
  resolved: "success",
  closed: "neutral",

  // Ticket priority
  low: "neutral",
  medium: "warning",
  high: "danger",
  urgent: "danger",

  // User / host / moderator / vendor / business
  active: "success",
  suspended: "danger",
  rejected: "danger",
  inactive: "neutral",
  approved: "success",
  disabled: "neutral",

  // Delivery / notification
  sent: "info",
  delivered: "success",
  read: "success",

  // Discount
  exhausted: "warning",

  // Quota health
  good: "success",
  warning: "warning",
  critical: "danger",
};

// ── Domain overrides: where one word means two things ───────────────────────
const DOMAIN_OVERRIDES = {
  payment: { completed: "success" }, // money received, not "inert"
  subscription: { cancelled: "neutral" }, // terminal but not an error
  delivery: { pending: "neutral" }, // not-yet-sent, not "awaiting action"
  assignment: { paid: "info" }, // paid but activation still pending (intermediate)
};

const normalize = (status) =>
  String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

/** Resolve a status (+ optional domain) to a semantic tone key. */
export function getStatusTone(status, domain) {
  const key = normalize(status);
  const override = domain && DOMAIN_OVERRIDES[domain] && DOMAIN_OVERRIDES[domain][key];
  return override || BASE_TONE[key] || "neutral";
}

/** Resolve a status (+ optional domain) to its { fg, bg, tone } colors. */
export function getStatusVisual(status, domain) {
  const tone = getStatusTone(status, domain);
  return { ...STATUS_TONES[tone], tone };
}

export default getStatusVisual;
