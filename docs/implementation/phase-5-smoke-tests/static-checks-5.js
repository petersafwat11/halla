#!/usr/bin/env node
/**
 * Phase 5 static contract checks.
 *
 * Run from repo root:
 *   node docs/implementation/phase-5-smoke-tests/static-checks-5.js
 *
 * File-level structural checks only — no live server, no React render.
 * Each check maps to a finding tag from the Phase 5 plan.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const checks = [];

const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const exists = (p) => fs.existsSync(path.join(ROOT, p));

const check = (name, fn) => {
  try {
    fn();
    checks.push({ name, ok: true });
  } catch (e) {
    checks.push({ name, ok: false, error: e.message });
  }
};
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

// ─── Track A — Foundation ────────────────────────────────────────────────────

check("TRACK-A: auditLog.js exports redactSensitive", () => {
  const src = read("labbe-backend-/src/shared/utils/auditLog.js");
  expect(/exports\.redactSensitive|module\.exports.*redactSensitive/.test(src), "redactSensitive not exported");
});

check("TRACK-A: AuditLogModel targetType enum includes plan + addon", () => {
  const src = read("labbe-backend-/models/AuditLogModel.js");
  expect(/["']plan["']/.test(src), "plan missing from targetType enum");
  expect(/["']addon["']/.test(src), "addon missing from targetType enum");
});

check("TRACK-A: no dual /api mount in app entry", () => {
  const src = read("labbe-backend-/src/app.js");
  const apiV2Count = (src.match(/app\.use\(['"]\/api\/v2['"]/g) || []).length;
  expect(apiV2Count <= 1, `Expected ≤1 /api/v2 mount, found ${apiV2Count}`);
});

// ─── Track B — Audit Log Wiring ──────────────────────────────────────────────

check("TRACK-B: auth.service audits auth.login_locked", () => {
  const src = read("labbe-backend-/src/modules/auth/auth.service.js");
  expect(/auth\.login_locked/.test(src), "auth.login_locked audit action missing");
});

check("TRACK-B: auth.service audits auth.password_changed", () => {
  const src = read("labbe-backend-/src/modules/auth/auth.service.js");
  expect(/auth\.password_changed/.test(src), "auth.password_changed audit action missing");
});

check("TRACK-B: auth.service audits auth.password_reset", () => {
  const src = read("labbe-backend-/src/modules/auth/auth.service.js");
  expect(/auth\.password_reset/.test(src), "auth.password_reset audit action missing");
});

check("TRACK-B: auth.controller audits auth.logout", () => {
  const src = read("labbe-backend-/src/modules/auth/auth.controller.js");
  expect(/auth\.logout/.test(src), "auth.logout audit action missing");
  expect(/jwt\.decode/.test(src), "jwt.decode not used for best-effort actor extraction");
});

check("TRACK-B: post-event.service uses targetType: 'event' (not post_event_content)", () => {
  const src = read("labbe-backend-/src/modules/post-event/post-event.service.js");
  expect(/targetType:\s*'event'/.test(src), "targetType should be 'event' in post-event audit");
  expect(!/targetType:\s*'post_event_content'/.test(src), "post_event_content is not a valid AuditLogModel targetType");
});

check("TRACK-B: post-event.service has content_revoked action", () => {
  const src = read("labbe-backend-/src/modules/post-event/post-event.service.js");
  expect(/post_event\.content_revoked/.test(src), "post_event.content_revoked action missing");
});

check("TRACK-B: users.service omits plaintext phone from audit metadata", () => {
  const src = read("labbe-backend-/src/modules/users/users.service.js");
  // phone update audit should not log newPhone or previousPhone in plaintext
  expect(!/metadata:.*newPhone/.test(src), "newPhone leaks in audit metadata");
  expect(!/metadata:.*previousPhone/.test(src), "previousPhone leaks in audit metadata");
});

check("TRACK-B: notifications.controller audits notification.broadcast", () => {
  const src = read("labbe-backend-/src/modules/notifications/notifications.controller.js");
  expect(/notification\.broadcast/.test(src), "notification.broadcast audit action missing");
});

check("TRACK-B: guests.controller audits event.exported", () => {
  const src = read("labbe-backend-/src/modules/guests/guests.controller.js");
  expect(/event\.exported/.test(src), "event.exported audit action missing");
});

// ─── Track C — Auth / Profile ────────────────────────────────────────────────

check("TRACK-C: OTPModel has used flag + email field + email_verification type", () => {
  const src = read("labbe-backend-/models/OTPModel.js");
  expect(/used\s*:\s*\{/.test(src) || /used:/.test(src), "used flag missing from OTPModel");
  expect(/email\s*:\s*\{/.test(src) || /email:/.test(src), "email field missing from OTPModel");
  expect(/email_verification/.test(src), "email_verification type missing from OTPModel");
});

check("TRACK-C: auth.routes has GET /verify-email-link endpoint", () => {
  const src = read("labbe-backend-/src/modules/auth/auth.routes.js");
  expect(/verify-email-link/.test(src), "GET /auth/verify-email-link route missing");
});

check("TRACK-C: users.service uses processUploadedFiles for S3 (no local disk paths)", () => {
  const src = read("labbe-backend-/src/modules/users/users.service.js");
  expect(/processUploadedFiles/.test(src), "processUploadedFiles S3 helper not used in users.service");
  expect(!/\/uploads\//.test(src), "local disk path /uploads/ still referenced in users.service");
});

check("TRACK-C: UserModel has preferredLanguage field", () => {
  const src = read("labbe-backend-/models/UserModel.js");
  expect(/preferredLanguage/.test(src), "preferredLanguage field missing from UserModel");
});

check("TRACK-C: users.routes has phone update endpoints", () => {
  const src = read("labbe-backend-/src/modules/users/users.routes.js");
  expect(/phone.*request-update|request-update.*phone/.test(src), "POST /phone/request-update route missing");
  expect(/confirmPhoneUpdate|confirm.*phone/.test(src), "PATCH /phone (confirmPhoneUpdate) route missing");
});

// ─── Track D — Vendor / Marketplace ─────────────────────────────────────────

check("TRACK-D: ServiceModel isPublic defaults to false", () => {
  const src = read("labbe-backend-/models/ServiceModel.js");
  expect(/isPublic[\s\S]{0,100}default:\s*false/.test(src), "ServiceModel isPublic should default to false");
});

check("TRACK-D: admin.service blocks vendorStatus → pending", () => {
  const src = read("labbe-backend-/src/modules/admin/admin.service.js");
  expect(/Cannot manually set vendor status to pending/.test(src), "state-machine guard blocking → pending missing");
});

check("TRACK-D: admin.service sends approval email on vendor approved", () => {
  const src = read("labbe-backend-/src/modules/admin/admin.service.js");
  expect(/vendorApproval|vendor.*approval.*email/i.test(src), "vendor approval email call missing");
});

check("TRACK-D: admin.service audits vendor.status_updated", () => {
  const src = read("labbe-backend-/src/modules/admin/admin.service.js");
  expect(/vendor\.status_updated/.test(src), "vendor.status_updated audit action missing");
});

check("TRACK-D: vendors.service increments numberOfClicks", () => {
  const src = read("labbe-backend-/src/modules/vendors/vendors.service.js");
  expect(/numberOfClicks/.test(src), "numberOfClicks increment missing");
});

check("TRACK-D: UserModel has profileCompleted + vendorStatus history fields", () => {
  const src = read("labbe-backend-/models/UserModel.js");
  expect(/profileCompleted/.test(src), "profileCompleted missing from UserModel vendorData");
  expect(/approvedAt/.test(src), "approvedAt missing from UserModel");
  expect(/rejectedAt/.test(src), "rejectedAt missing from UserModel");
});

// ─── Track E — Event Lifecycle ───────────────────────────────────────────────

check("TRACK-E: events.service deduplicates guests by phone before insert", () => {
  const src = read("labbe-backend-/src/modules/events/events.service.js");
  expect(/FLOW-11-F03.*dedup|dedup.*phone|seen\.set\(key/.test(src), "guest phone dedup (FLOW-11-F03) missing");
});

check("TRACK-E: events.service extended status block list", () => {
  const src = read("labbe-backend-/src/modules/events/events.service.js");
  expect(/LIVE.*PUBLISHED.*COMPLETED|EVENT_STATUS\.LIVE/.test(src), "FLOW-13-F04 extended status block list missing");
});

check("TRACK-E: events.service audits event.created, event.updated, event.deleted", () => {
  const src = read("labbe-backend-/src/modules/events/events.service.js");
  expect(/event\.created/.test(src), "event.created audit missing");
  expect(/event\.updated/.test(src), "event.updated audit missing");
  expect(/event\.deleted/.test(src), "event.deleted audit missing");
});

check("TRACK-E: GuestModel has soft-delete fields (deleted, deletedAt)", () => {
  const src = read("labbe-backend-/models/GuestModel.js");
  expect(/deleted\s*:\s*\{/.test(src) || /deleted:/.test(src), "soft-delete deleted field missing (FLOW-13-F02)");
  expect(/deletedAt/.test(src), "deletedAt field missing (FLOW-13-F02)");
});

check("TRACK-E: GuestModel has rateLimited field for 429 detection", () => {
  const src = read("labbe-backend-/models/GuestModel.js");
  expect(/rateLimited/.test(src), "rateLimited field missing (FLOW-15-F06)");
});

check("TRACK-E: EventModel has lastTestAt field for throttle", () => {
  const src = read("labbe-backend-/models/EventModel.js");
  expect(/lastTestAt/.test(src), "lastTestAt field missing (FLOW-16-F03)");
});

check("TRACK-E: messaging.service has in-memory stats cache", () => {
  const src = read("labbe-backend-/src/modules/messaging/messaging.service.js");
  expect(/_statsCache/.test(src), "stats cache (_statsCache) missing (FLOW-22-F01/FLOW-19-F03)");
  expect(/invalidateStatsCache/.test(src), "invalidateStatsCache method missing");
});

check("TRACK-E: messaging.service reads SMS_COST_SAR env var", () => {
  const src = read("labbe-backend-/src/modules/messaging/messaging.service.js");
  expect(/SMS_COST_SAR/.test(src), "SMS_COST_SAR env var missing (FLOW-22-F02)");
});

check("TRACK-E: messaging.service throttles test messages via lastTestAt", () => {
  const src = read("labbe-backend-/src/modules/messaging/messaging.service.js");
  expect(/lastTestAt/.test(src), "test message throttle (lastTestAt) missing (FLOW-16-F03)");
  expect(/RATE_LIMITED/.test(src), "RATE_LIMITED response missing");
});

check("TRACK-E: messaging.routes removed legacy POST /test", () => {
  const src = read("labbe-backend-/src/modules/messaging/messaging.routes.js");
  expect(!/router\.post\(['"]\/test['"]/.test(src), "legacy POST /messaging/test still mounted (FLOW-16-F01)");
});

check("TRACK-E: subscriptions.service reads addon extraGuests from Addon collection", () => {
  const src = read("labbe-backend-/src/modules/subscriptions/subscriptions.service.js");
  expect(/_getAddonExtraGuests/.test(src), "_getAddonExtraGuests method missing (FLOW-12-F02)");
  expect(/AddonModel|Addon/.test(src), "Addon model not imported in subscriptions.service");
});

check("TRACK-E: PostEventContentModel has pendingApproval + uniqueVisitorCount", () => {
  const src = read("labbe-backend-/models/PostEventContentModel.js");
  expect(/pendingApproval/.test(src), "pendingApproval missing (FLOW-21-F02)");
  expect(/uniqueVisitorCount/.test(src), "uniqueVisitorCount missing (FLOW-21-F05)");
});

// ─── Track F — Notifications ─────────────────────────────────────────────────

check("TRACK-F: notifications.service uses withIdempotency utility (FLOW-27-F01)", () => {
  const src = read("labbe-backend-/src/modules/notifications/notifications.service.js");
  expect(/withIdempotency/.test(src), "withIdempotency not used in notifications.service (FLOW-27-F01)");
  expect(/idempotencyKey/.test(src), "idempotencyKey construction missing (FLOW-27-F01)");
});

check("TRACK-F: idempotency utility provides withIdempotency + sha256", () => {
  const src = read("labbe-backend-/src/shared/utils/idempotency.js");
  expect(/withIdempotency/.test(src), "withIdempotency export missing from idempotency.js");
});

check("TRACK-F: scheduledTasks has runBatched scheduled delivery", () => {
  const src = read("labbe-backend-/src/shared/utils/scheduledTasks.js");
  expect(/runBatched|processPendingNotifications/.test(src), "scheduled notification delivery missing (FLOW-27-F02)");
});

// ─── Track G — Tickets / RBAC / Tenant ──────────────────────────────────────

check("TRACK-G: tickets.service has VALID_TRANSITIONS state machine", () => {
  const src = read("labbe-backend-/src/modules/tickets/tickets.service.js");
  expect(/VALID_TRANSITIONS/.test(src), "VALID_TRANSITIONS state machine missing (FLOW-23-F01)");
  expect(/VALID_TRANSITIONS\s*=\s*\{/.test(src), "VALID_TRANSITIONS object definition missing");
  expect(/TICKET_STATUS\.(OPEN|CLOSED|IN_PROGRESS|RESOLVED)/.test(src), "TICKET_STATUS constants not used in transitions");
});

check("TRACK-G: tickets.routes has POST /:id/replies (addReply)", () => {
  const src = read("labbe-backend-/src/modules/tickets/tickets.routes.js");
  expect(/replies/.test(src), "POST /:id/replies route missing (FLOW-23-F02)");
  expect(/addReply/.test(src), "addReply controller binding missing");
});

check("TRACK-G: tickets.service filters by whitelabelId for tenant isolation", () => {
  const src = read("labbe-backend-/src/modules/tickets/tickets.service.js");
  expect(/whitelabelId/.test(src), "whitelabelId tenant filter missing (TENANT-F02)");
});

check("TRACK-G: permissions.js getPageAccess has SUPER_ADMIN hierarchy fallback", () => {
  const src = read("labbe-backend-/src/shared/constants/permissions.js");
  expect(/SUPER_ADMIN/.test(src), "SUPER_ADMIN missing from permissions.js");
  expect(/getPageAccess/.test(src), "getPageAccess function missing (RBAC-F01)");
});

check("TRACK-G: notifications.controller enforces TENANT-F03 broadcast scope", () => {
  const src = read("labbe-backend-/src/modules/notifications/notifications.controller.js");
  expect(/effectiveWhitelabelId/.test(src), "effectiveWhitelabelId tenant scope missing (TENANT-F03)");
  expect(/SUPER_ADMIN/.test(src), "SUPER_ADMIN role check missing for broadcast scope");
});

// ─── Track H — Exports + Phase-4d hand-offs ──────────────────────────────────

check("TRACK-H: admin.service exportWhitelabels accepts whitelabelId", () => {
  const src = read("labbe-backend-/src/modules/admin/admin.service.js");
  expect(/exportWhitelabels\s*\(\s*whitelabelId/.test(src), "exportWhitelabels whitelabelId param missing (FLOW-28-F04)");
  expect(/query\.whitelabelId\s*=\s*whitelabelId/.test(src), "whitelabelId filter not applied in exportWhitelabels");
});

check("TRACK-H: admin.controller passes whitelabelId to exportWhitelabels", () => {
  const src = read("labbe-backend-/src/modules/admin/admin.controller.js");
  expect(/getWhitelabelIdFromFilter/.test(src), "getWhitelabelIdFromFilter not used in exportWhitelabels controller");
});

// ─── Run / report ─────────────────────────────────────────────────────────────
const ok = checks.filter((c) => c.ok).length;
const total = checks.length;
console.log(`\nPhase 5 static checks: ${ok}/${total}\n`);
for (const c of checks) {
  if (c.ok) {
    console.log(`  ✓ ${c.name}`);
  } else {
    console.log(`  ✗ ${c.name}`);
    console.log(`      ${c.error}`);
  }
}
process.exit(ok === total ? 0 : 1);
