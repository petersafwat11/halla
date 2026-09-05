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
  eventId: z.string().trim().regex(/^[A-Za-z0-9_-]{1,64}$/).nullable().optional(),
  returnTo: z.enum(["dashboard", "Home"]).nullable().optional(),
}).strict();

/**
 * Parses and sanitizes an incoming completion destination.
 * Falls back safely to { kind: "plans" } if invalid or missing.
 *
 * @param {Object|null|undefined} input
 * @returns {{ kind: string, eventId: string|null, returnTo: string|null }}
 */
export function parseCompletionDestination(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { kind: COMPLETION_KINDS.PLANS, eventId: null, returnTo: null };
  }
  const result = completionDestinationSchema.safeParse(input);
  if (!result.success) {
    return { kind: COMPLETION_KINDS.PLANS, eventId: null, returnTo: null };
  }
  return {
    kind: result.data.kind,
    eventId: result.data.eventId || null,
    returnTo: result.data.returnTo || null,
  };
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
  const locale = lang === "en" ? "en" : "ar";

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

  const hostTabRoute = (screen, params) => ({
    screen: "MainTabs",
    params: {
      screen,
      ...(params ? { params } : {}),
    },
  });

  const hostEventsRoute = (screen, params) =>
    hostTabRoute("Events", {
      screen,
      ...(params ? { params } : {}),
    });

  switch (parsed.kind) {
    case COMPLETION_KINDS.EVENT_GATE:
      if (parsed.eventId) {
        return hostEventsRoute("EventDetails", { eventId: parsed.eventId });
      }
      return hostEventsRoute("CreateEventScreen");

    case COMPLETION_KINDS.INVITATION_BALANCE:
      if (parsed.returnTo === "Home") {
        return hostTabRoute("Home");
      }
      if (parsed.eventId) {
        return hostEventsRoute("EventDetails", { eventId: parsed.eventId });
      }
      return hostTabRoute("Home");

    case COMPLETION_KINDS.PLANS:
    default:
      return hostTabRoute("Plans");
  }
}
