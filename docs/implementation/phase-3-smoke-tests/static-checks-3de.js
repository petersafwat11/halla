#!/usr/bin/env node
/**
 * Phase 3de static-check smoke tests.
 *
 * Same pattern as `static-checks.js` for Phase 3abc — source-grep
 * assertions in lieu of a live Playwright run (no host available in this
 * environment). Live runbook for each spec is in `runbooks.md`.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../../..");

const failures = [];
const successes = [];

function read(p) {
  return fs.readFileSync(path.join(ROOT, p), "utf8");
}
function check(name, fn) {
  try {
    const ok = fn();
    if (ok === true) {
      successes.push(name);
      console.log(`PASS — ${name}`);
    } else {
      failures.push(`${name}: ${ok || "false"}`);
      console.log(`FAIL — ${name}: ${ok || "false"}`);
    }
  } catch (err) {
    failures.push(`${name}: ${err.message}`);
    console.log(`FAIL — ${name}: ${err.message}`);
  }
}

// ---------- 3d ----------

check("3d.1 — webhook fails closed when env unset / signature missing / mismatch", () => {
  const ctrl = read("labbe-backend-/src/modules/messaging/messaging.controller.js");
  if (!ctrl.includes("misconfigured_secret")) return "missing env-unset branch";
  if (!ctrl.includes("missing_signature")) return "missing missing-signature branch";
  if (!ctrl.includes("invalid_signature")) return "missing mismatch branch";
  if (!ctrl.includes("status(401)")) return "401 not used";
  return true;
});

check("3d.2 — RSVP route wired with idempotency middleware + derived key", () => {
  const routes = read("labbe-backend-/src/modules/guests/guests.routes.js");
  if (!routes.includes("deriveRsvpIdempotencyKey")) return "key derivation middleware missing";
  if (!routes.includes("idempotency({ scope: 'guests.rsvp' })")) return "idempotency middleware not wired with rsvp scope";
  return true;
});

check("3d.3 — webhook host-notification dedup wraps button-response handler", () => {
  const ctrl = read("labbe-backend-/src/modules/messaging/messaging.controller.js");
  if (!ctrl.includes("withIdempotency")) return "withIdempotency not used in webhook";
  if (!ctrl.includes("webhook_button:")) return "webhook dedup key namespace missing";
  if (!ctrl.includes("Math.floor(Date.now() / 30000)")) return "30s bucket fallback missing";
  return true;
});

check("3d.4 — web stats hook supports status-keyed polling cadence", () => {
  const hook = read("labbe/hooks/events/queries/useSingleEventStats.js");
  if (!hook.includes("refetchInterval")) return "refetchInterval not set";
  if (!hook.includes("30 * 1000")) return "30s cadence missing";
  if (!hook.includes("5 * 60 * 1000")) return "5min cadence missing";
  return true;
});

check("3d.4 — mobile stats hook supports status-keyed polling cadence", () => {
  const hook = read("halla-mobile/hooks/queries/useEvents.js");
  if (!hook.includes("refetchInterval")) return "refetchInterval not set";
  if (!hook.includes("EXPO_PUBLIC_STATS_POLL_INTERVAL_MS")) return "override env var not honored";
  return true;
});

check("3d.4 — host EventStats wires eventStatus to the stats hook", () => {
  const stats = read("labbe/app/[lang]/host/events/[id]/_components/EventStats.jsx");
  return stats.includes("eventStatus") || "eventStatus not passed to useSingleEventStats";
});

check("3d.4 — mobile EventsScreen passes selectedEvent.status to useSingleEventStats", () => {
  // Phase 4 W1-STATS migrated EventsScreen to the options-object shape
  // (`{ eventStatus: ... }`). The legacy positional shim still works,
  // so accept either form here.
  const screen = read("halla-mobile/screens/EventsScreen.js");
  const positional = screen.includes(
    "useSingleEventStats(selectedEventId, selectedEvent?.status)"
  );
  const optionsObject = /useSingleEventStats\(\s*selectedEventId,\s*\{\s*eventStatus/.test(screen);
  return (
    positional || optionsObject || "EventsScreen not passing status"
  );
});

// ---------- 3e ----------

check("3e.1 — staff revoke endpoint registered (events.routes.js)", () => {
  const routes = read("labbe-backend-/src/modules/events/events.routes.js");
  if (!routes.includes("/staff/:staffId/revoke")) return "route missing";
  const ctrl = read("labbe-backend-/src/modules/staff/staff.controller.js");
  if (!ctrl.includes("revokeStaffToken")) return "controller missing";
  const svc = read("labbe-backend-/src/modules/staff/staff.service.js");
  if (!svc.includes("async revokeStaffToken")) return "service missing";
  return true;
});

check("3e.1 — staff revoke service enforces RBAC + idempotent re-revoke", () => {
  const svc = read("labbe-backend-/src/modules/staff/staff.service.js");
  return (
    svc.includes("isWhitelabelAdmin") &&
    svc.includes("wasAlreadyRevoked") &&
    svc.includes("ForbiddenError")
      ? true
      : "RBAC / idempotency missing in revokeStaffToken"
  );
});

check("3e.1 — AuditLog targetType enum extended with `staff_access_token`", () => {
  const m = read("labbe-backend-/models/AuditLogModel.js");
  return m.includes('"staff_access_token"') || "targetType enum not extended";
});

check("3e.2 — staff check-in uses atomic CAS for idempotency + alreadyCheckedIn flag", () => {
  const svc = read("labbe-backend-/src/modules/staff/staff.service.js");
  // The DB row's status field is the idempotency primitive — atomic
  // findOneAndUpdate guarded on `status !== 'checked_in'`. The HTTP-cache
  // approach was scrapped because it can't return `alreadyCheckedIn:
  // true` on replay (see _performIdempotentCheckIn docstring).
  if (!svc.includes("findOneAndUpdate")) return "atomic findOneAndUpdate missing";
  if (!svc.includes("status: { $ne: 'checked_in' }"))
    return "CAS guard missing — replay safety not enforced";
  if (!svc.includes("alreadyCheckedIn: false") || !svc.includes("alreadyCheckedIn: true"))
    return "first vs replay path not distinguished";
  return true;
});

check("3e.3 — guest QR rotation endpoint + service + revokedReason 'rotation'", () => {
  const routes = read("labbe-backend-/src/modules/guests/guests.routes.js");
  if (!routes.includes("/guests/:guestId/rotate-qr")) return "rotate-qr route missing";
  const svc = read("labbe-backend-/src/modules/guests/guests.service.js");
  if (!svc.includes("async rotateGuestQR")) return "rotateGuestQR service missing";
  if (!svc.includes("revokedReason: 'rotation'")) return "revokedReason='rotation' missing";
  return true;
});

check("3e.3 — GuestAccessToken validateToken returns structured `qr_rotated` reason", () => {
  const m = read("labbe-backend-/models/GuestAccessTokenModel.js");
  return (
    (m.includes('"qr_rotated"') &&
      m.includes('"qr_revoked"') &&
      m.includes('"qr_expired"')) ||
    "validateToken not returning structured reasons"
  );
});

check("3e.3 — post-event controller returns 410 Gone for rotated/revoked/expired", () => {
  const ctrl = read("labbe-backend-/src/modules/post-event/post-event.controller.js");
  return ctrl.includes("status(410)") || "410 path missing in validateToken controller";
});

check("3e.4 — manual revoke endpoint + service", () => {
  const routes = read("labbe-backend-/src/modules/guests/guests.routes.js");
  if (!routes.includes("/guests/:guestId/revoke-access")) return "revoke-access route missing";
  const svc = read("labbe-backend-/src/modules/guests/guests.service.js");
  if (!svc.includes("async revokeGuestAccess")) return "revokeGuestAccess service missing";
  if (!svc.includes("revokedReason: 'manual'")) return "revokedReason='manual' missing";
  return true;
});

check("3e.4 — backfill script exists with --dry-run / --apply / idempotency", () => {
  const s = read("labbe-backend-/scripts/backfill-guest-access-token-expiry.js");
  if (!s.includes("--apply")) return "--apply flag missing";
  if (!s.includes("--dry-run")) return "--dry-run mention missing";
  if (!s.includes("Idempotent")) return "idempotency note missing";
  return true;
});

// ---------- summary ----------

console.log("");
console.log(`SUMMARY: ${successes.length} pass / ${failures.length} fail`);
if (failures.length) {
  console.log("");
  console.log("FAILURES:");
  failures.forEach((f) => console.log(" - " + f));
  process.exit(1);
}
process.exit(0);
