import { z } from "zod";

/**
 * Allowlisted completion destinations for post-purchase navigation (F-08 / PR5).
 * Enforces typed destinations: plans, event_gate, and invitation_balance.
 */
export const COMPLETION_KINDS = Object.freeze({
  PLANS: "plans",
  EVENT_GATE: "event_gate",
  INVITATION_BALANCE: "invitation_balance",
});

export const ALLOWED_COMPLETION_KINDS = Object.freeze([
  COMPLETION_KINDS.PLANS,
  COMPLETION_KINDS.EVENT_GATE,
  COMPLETION_KINDS.INVITATION_BALANCE,
]);

export const completionDestinationSchema = z.object({
  kind: z.enum([
    COMPLETION_KINDS.PLANS,
    COMPLETION_KINDS.EVENT_GATE,
    COMPLETION_KINDS.INVITATION_BALANCE,
  ]).default(COMPLETION_KINDS.PLANS),
  eventId: z.string().trim().min(1).nullable().optional(),
  returnTo: z.string().trim().min(1).nullable().optional(),
}).passthrough();

/**
 * Parses and sanitizes an incoming completion destination.
 * Falls back safely to { kind: "plans" } if invalid or missing.
 *
 * @param {Object|null|undefined} input
 * @returns {{ kind: string, eventId: string|null, returnTo: string|null }}
 */
export function parseCompletionDestination(input) {
  if (!input || typeof input !== "object") {
    return { kind: COMPLETION_KINDS.PLANS, eventId: null, returnTo: null };
  }

  const rawKind = input.kind || input.origin || COMPLETION_KINDS.PLANS;
  const kind = ALLOWED_COMPLETION_KINDS.includes(rawKind)
    ? rawKind
    : COMPLETION_KINDS.PLANS;

  const eventId = input.eventId && typeof input.eventId === "string" && input.eventId.trim()
    ? input.eventId.trim()
    : null;

  const returnTo = input.returnTo && typeof input.returnTo === "string" && input.returnTo.trim()
    ? input.returnTo.trim()
    : null;

  return { kind, eventId, returnTo };
}

/**
 * Resolves the completion destination to a web URL path.
 *
 * @param {Object} destination
 * @param {string} [lang="ar"]
 * @returns {string} URL path
 */
export function resolveWebCompletionUrl(destination, lang = "ar") {
  const parsed = parseCompletionDestination(destination);
  const locale = lang || "ar";

  switch (parsed.kind) {
    case COMPLETION_KINDS.EVENT_GATE:
      if (parsed.eventId) {
        return `/${locale}/host/events/${parsed.eventId}`;
      }
      return `/${locale}/host/create-event`;

    case COMPLETION_KINDS.INVITATION_BALANCE:
      if (parsed.returnTo === "dashboard") {
        return `/${locale}/host`;
      }
      if (parsed.eventId) {
        return `/${locale}/host/events/${parsed.eventId}`;
      }
      return `/${locale}/host/events`;

    case COMPLETION_KINDS.PLANS:
    default:
      return `/${locale}/host/plans`;
  }
}

/**
 * Resolves the completion destination to a React Navigation action / target.
 *
 * @param {Object} destination
 * @returns {{ screen: string, params?: Object }}
 */
export function resolveMobileCompletionRoute(destination) {
  const parsed = parseCompletionDestination(destination);

  switch (parsed.kind) {
    case COMPLETION_KINDS.EVENT_GATE:
      if (parsed.eventId) {
        return { screen: "EventDetails", params: { eventId: parsed.eventId } };
      }
      return { screen: "CreateEvent" };

    case COMPLETION_KINDS.INVITATION_BALANCE:
      if (parsed.returnTo === "Home") {
        return { screen: "MainTabs", params: { screen: "Home" } };
      }
      if (parsed.eventId) {
        return { screen: "EventDetails", params: { eventId: parsed.eventId } };
      }
      return { screen: "MainTabs", params: { screen: "Home" } };

    case COMPLETION_KINDS.PLANS:
    default:
      return { screen: "MainTabs", params: { screen: "Plans" } };
  }
}
