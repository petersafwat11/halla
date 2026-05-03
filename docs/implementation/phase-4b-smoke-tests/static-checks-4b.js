#!/usr/bin/env node
/**
 * Phase 4b static contract checks.
 *
 * Run from repo root:
 *   node docs/implementation/phase-4b-smoke-tests/static-checks-4b.js
 *
 * Phase 4b is mostly correctness + UX work; these checks confirm the
 * file-level contracts each sub-track was supposed to land. They DO NOT
 * boot the backend or render the UI — that's covered in
 * `PHASE_4B_MANUAL_VERIFICATION.md`.
 *
 * Coverage map:
 *   INV08          rename mapping doc exists with all 5 tasks + §7
 *   W0-RBAC        scope helper present, capacity guard literal,
 *                  schedule min-date constant, controller passes req.user
 *   W0-STAFF       new GET /events/:eventId/staff-tokens route mounted
 *   W0-EMAIL       updateWhitelabelStatus sends approval email behind
 *                  dispatchSetupEmail flag, uses createPasswordSetupToken
 *   W1-UNIFY       admin-dash duplicate deleted, host wizard accepts
 *                  returnPath, both pages thin-wrap, per-step PATCH
 *                  service methods take userContext
 *   W1-UPD         StepTwo accepts allowAddOnly, wizard sets it via
 *                  isEventLive, lockout banner strings exist in AR + EN
 *   W1-GATE-FAIL   useEventActionGate hook exists (web), PartialFailureBanner
 *                  exists, EventStats mounts it, EventActionsHeader
 *                  consumes the hook
 *   W1-WL-EMAIL    /setup-password/[token] route + SetupPassword form +
 *                  validateSetupToken + setupPassword auth mutations +
 *                  ApproveWhitelabelDialog wired into WL details page
 *   W1-IMG-PATH    getMediaUrl helper exists in utils/index.js
 *   W2-POLL-FAIL   mobile useEventActionGate + PartialFailureBanner +
 *                  consumers refactored to use the hook + EventDetails
 *                  mounts banner
 *   W2-STAFF       mobile listStaffTokens service + SingleEventStats
 *                  consumes it
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

// ─── INV08 ────────────────────────────────────────────────────────────────────
check("INV08: rename-mapping doc exists with all 5 tasks + §7", () => {
  const p = "docs/inventory/phase-4-extension/08-event-shape-rename-mapping.md";
  expect(exists(p), `${p} missing`);
  const src = read(p);
  expect(/Task 1 — Field inventory/.test(src), "Task 1 missing");
  expect(/Task 2 — Call-site inventory/.test(src), "Task 2 missing");
  expect(/Task 3 — Cross-cutting issues/.test(src), "Task 3 missing");
  expect(/Task 4 — Proposed rename mapping/.test(src), "Task 4 missing");
  expect(/Task 5 — Migration considerations/.test(src), "Task 5 missing");
  expect(/§7 — Open questions for Peter/.test(src), "§7 open questions missing");
  expect(/needs Peter decision/.test(src), "Task 4 lacks 'needs Peter decision' rows");
});

// ─── W0-RBAC ──────────────────────────────────────────────────────────────────
check("W0-RBAC: events.service _buildScopedEventQuery present", () => {
  const src = read("labbe-backend-/src/modules/events/events.service.js");
  expect(src.includes("_buildScopedEventQuery"), "_buildScopedEventQuery missing");
  expect(src.includes("ROLES.SUPER_ADMIN"), "SUPER_ADMIN scope branch missing");
  expect(src.includes("ROLES.WHITELABEL_ADMIN"), "WHITELABEL_ADMIN scope branch missing");
  expect(/getEventById\s*\(eventId,\s*userContext\)/.test(src), "getEventById signature not migrated");
  expect(/getSingleEventStats\s*\(eventId,\s*userContext\)/.test(src), "getSingleEventStats signature not migrated");
});

check("W0-RBAC: capacity floor guard with GUEST_LIST_BELOW_CONFIRMED", () => {
  const src = read("labbe-backend-/src/modules/events/events.service.js");
  expect(src.includes("GUEST_LIST_BELOW_CONFIRMED"), "code constant missing");
  expect(/newCount\s*<\s*confirmedCount/.test(src), "floor comparison missing");
});

check("W0-RBAC: schedule min-date enforced + SCHEDULE_TOO_SOON code", () => {
  const messaging = read("labbe-backend-/src/modules/messaging/messaging.service.js");
  expect(messaging.includes("SCHEDULE_TOO_SOON"), "SCHEDULE_TOO_SOON missing");
  expect(messaging.includes("scheduleMinLeadHours"), "config.events.scheduleMinLeadHours not consumed");
  expect(messaging.includes("parseEventTime"), "parseEventTime not used for scheduledInstant");

  const env = read("labbe-backend-/src/config/env.js");
  expect(env.includes("SCHEDULE_MIN_LEAD_HOURS"), "env var not validated");

  const cfg = read("labbe-backend-/src/config/index.js");
  expect(cfg.includes("scheduleMinLeadHours"), "config.events.scheduleMinLeadHours not exported");
});

check("W0-RBAC: events.controller passes req.user (not req.user._id) to scope-aware methods", () => {
  const src = read("labbe-backend-/src/modules/events/events.controller.js");
  expect(/getEventById\(\s*req\.params\.id,\s*req\.user\s*\)/.test(src), "getEventById call did not migrate");
  expect(/getSingleEventStats\(\s*req\.params\.id,\s*req\.user\s*\)/.test(src), "getSingleEventStats call did not migrate");
  expect(/updateEventDetails\(\s*req\.params\.id,\s*req\.body,\s*req\.user\s*\)/.test(src),
    "updateEventDetails call did not migrate");
  expect(/updateGuestList\(\s*req\.params\.id,\s*req\.body\.guestList,\s*req\.user\s*\)/.test(src),
    "updateGuestList call did not migrate");
});

// ─── W0-STAFF ─────────────────────────────────────────────────────────────────
check("W0-STAFF: GET /events/:eventId/staff-tokens route mounted", () => {
  const routes = read("labbe-backend-/src/modules/events/events.routes.js");
  expect(routes.includes('router.get(\n  "/:eventId/staff-tokens"'),
    "staff-tokens GET route not mounted");
  expect(routes.includes("staffController.listStaffTokens"),
    "controller binding missing");
});

check("W0-STAFF: staff.service.listStaffTokens implemented with RBAC", () => {
  const src = read("labbe-backend-/src/modules/staff/staff.service.js");
  expect(src.includes("listStaffTokens"), "listStaffTokens missing");
  expect(/Not authorized to view staff tokens/.test(src),
    "RBAC error message missing");
  expect(/StaffAccessToken\.find\(\{\s*event:\s*eventId\s*\}\)/.test(src),
    "list query not present");
});

// ─── W0-EMAIL ─────────────────────────────────────────────────────────────────
check("W0-EMAIL: updateWhitelabelStatus accepts dispatchSetupEmail + opts.actor", () => {
  const src = read("labbe-backend-/src/modules/admin/admin.service.js");
  expect(/async updateWhitelabelStatus\(whitelabelId,\s*status,\s*opts/.test(src),
    "opts arg missing");
  expect(src.includes("dispatchSetupEmail"), "flag not consumed");
  expect(src.includes("createPasswordSetupToken"), "token mint not invoked");
  expect(src.includes("email.send.whitelabelApproval"), "email send not invoked");
  expect(src.includes("setupPasswordUrl"), "setupPasswordUrl not constructed");
  expect(src.includes("logAudit"), "audit log not written");
});

check("W0-EMAIL: admin.controller forwards dispatchSetupEmail + req.user", () => {
  const src = read("labbe-backend-/src/modules/admin/admin.controller.js");
  expect(src.includes("dispatchSetupEmail"), "controller did not forward flag");
  expect(/actor:\s*req\.user/.test(src), "actor not forwarded");
});

// ─── W1-UNIFY ─────────────────────────────────────────────────────────────────
check("W1-UNIFY: admin-dash UpdateEventContent.jsx is gone", () => {
  expect(
    !exists("labbe/app/[lang]/admin-dash/update-event/_components/UpdateEventContent.jsx"),
    "duplicate still present"
  );
});

check("W1-UNIFY: host UpdateEventWizard exists with returnPath prop", () => {
  const p = "labbe/app/[lang]/host/update-event/_components/UpdateEventWizard.jsx";
  expect(exists(p), "wizard component missing");
  const src = read(p);
  expect(/returnPath/.test(src), "returnPath prop not declared");
  expect(src.includes("useUpdateLaunchSettings"), "launchSettings dispatch not wired");
  expect(src.includes("isEventLive"), "live-event branch not present");
});

check("W1-UNIFY: host + admin pages thin-wrap the wizard", () => {
  const host = read("labbe/app/[lang]/host/update-event/page.js");
  expect(host.includes("UpdateEventWizard"), "host page does not import wizard");
  expect(host.includes('returnPath="host"'), "host page returnPath wrong");

  const admin = read("labbe/app/[lang]/admin-dash/update-event/page.js");
  expect(admin.includes("UpdateEventWizard"), "admin page does not import wizard");
  expect(admin.includes('returnPath="admin-dash/events"'), "admin page returnPath wrong");
});

check("W1-UNIFY: per-step PATCH service methods take userContext", () => {
  const src = read("labbe-backend-/src/modules/events/events.service.js");
  expect(/async updateEventDetails\(eventId,\s*details,\s*userContext\)/.test(src),
    "updateEventDetails signature wrong");
  expect(/async updateGuestList\(eventId,\s*guestList,\s*userContext\)/.test(src),
    "updateGuestList signature wrong");
  expect(/async updateStaffList\(eventId,\s*staffList,\s*userContext\)/.test(src),
    "updateStaffList signature wrong");
  expect(/async updateInvitationSettings\(eventId,\s*settings,\s*userContext,\s*file\)/.test(src),
    "updateInvitationSettings signature wrong");
  expect(/async updateLaunchSettings\(eventId,\s*settings,\s*userContext\)/.test(src),
    "updateLaunchSettings signature wrong");
  expect(/async sendTestMessage\(eventId,\s*messageData,\s*userContext\)/.test(src),
    "sendTestMessage signature wrong");
});

// ─── W1-UPD ───────────────────────────────────────────────────────────────────
check("W1-UPD: StepTwo accepts allowAddOnly + gates table actions", () => {
  const src = read("labbe/app/[lang]/host/create-event/_components/stepTwo/StepTwo.js");
  expect(/allowAddOnly\s*=\s*false/.test(src), "prop not declared");
  expect(/allowAddOnly\s*\?\s*\[\]\s*:/.test(src),
    "actions / bulkActions not gated");
});

check("W1-UPD: bilingual lockout strings present in createEvent.json", () => {
  for (const lang of ["en", "ar"]) {
    const src = read(`labbe/localization/locales/${lang}/createEvent.json`);
    expect(src.includes("live_event_locked_notice"), `${lang}: live_event_locked_notice missing`);
    expect(src.includes("live_event_step2_notice"), `${lang}: live_event_step2_notice missing`);
    expect(src.includes("update_locked_live_event"), `${lang}: update_locked_live_event missing`);
    expect(src.includes("launch_settings_updated"), `${lang}: launch_settings_updated missing`);
  }
});

// ─── W1-GATE-FAIL ─────────────────────────────────────────────────────────────
check("W1-GATE-FAIL: useEventActionGate hook exists (web)", () => {
  const p = "labbe/hooks/events/useEventActionGate.js";
  expect(exists(p), "hook missing");
  const src = read(p);
  expect(/canManualRetry/.test(src), "canManualRetry not returned");
  expect(/hasFailedSends/.test(src), "hasFailedSends not returned");
  expect(/canSendTest/.test(src), "canSendTest not returned");
});

check("W1-GATE-FAIL: PartialFailureBanner exists + mounted in EventStats", () => {
  expect(
    exists("labbe/app/[lang]/host/events/[id]/_components/PartialFailureBanner.jsx"),
    "PartialFailureBanner missing"
  );
  const stats = read("labbe/app/[lang]/host/events/[id]/_components/EventStats.jsx");
  expect(stats.includes("PartialFailureBanner"), "banner not mounted");
});

check("W1-GATE-FAIL: EventActionsHeader consumes the gate hook", () => {
  const src = read("labbe/ui/host/events/EventActionsHeader.jsx");
  expect(src.includes("useEventActionGate"), "hook not consumed");
});

// ─── W1-WL-EMAIL ──────────────────────────────────────────────────────────────
check("W1-WL-EMAIL: /setup-password/[token] route + form component exist", () => {
  expect(
    exists("labbe/app/[lang]/setup-password/[token]/page.jsx"),
    "route page missing"
  );
  const form = "labbe/ui/auth/setup-password/SetupPassword.js";
  expect(exists(form), "form component missing");
  const src = read(form);
  expect(src.includes("validateSetupToken"), "validate mutation not invoked");
  expect(src.includes("setupPassword"), "setupPassword mutation not invoked");
});

check("W1-WL-EMAIL: useAuthMutation exposes validateSetupToken + setupPassword", () => {
  const src = read("labbe/hooks/reactQueryHooks/useAuthMutation.js");
  expect(/validateSetupToken:\s*\{/.test(src), "validateSetupToken action missing");
  expect(/setupPassword:\s*\{/.test(src), "setupPassword action missing");
});

check("W1-WL-EMAIL: ApproveWhitelabelDialog exists + wired into WL details", () => {
  expect(
    exists("labbe/ui/admin/whitelabels/ApproveWhitelabelDialog.jsx"),
    "dialog missing"
  );
  const details = read("labbe/app/[lang]/admin-dash/whitelabels/[id]/_components/WhitelabelDetailsContent.jsx");
  expect(details.includes("ApproveWhitelabelDialog"), "dialog not imported");
  expect(details.includes("dispatchSetupEmail"), "flag not forwarded");
});

check("W1-WL-EMAIL: useAdminWhitelabelMutation forwards dispatchSetupEmail", () => {
  const src = read("labbe/hooks/reactQueryHooks/useAdmin.js");
  expect(src.includes("dispatchSetupEmail"), "mutation does not forward flag");
});

// ─── W1-IMG-PATH ──────────────────────────────────────────────────────────────
check("W1-IMG-PATH: getMediaUrl helper exists in utils/index.js", () => {
  const src = read("labbe/utils/index.js");
  expect(/export function getMediaUrl\(/.test(src), "helper not exported");
});

// ─── W2-POLL-FAIL ─────────────────────────────────────────────────────────────
check("W2-POLL-FAIL: mobile useEventActionGate + PartialFailureBanner exist", () => {
  expect(exists("halla-mobile/hooks/useEventActionGate.js"), "mobile hook missing");
  expect(
    exists("halla-mobile/components/home/PartialFailureBanner.js"),
    "mobile banner missing"
  );
});

check("W2-POLL-FAIL: mobile consumers refactored to use the hook", () => {
  const header = read("halla-mobile/components/home/EventActionsHeader.js");
  expect(header.includes("useEventActionGate"), "header does not consume hook");
  const card = read("halla-mobile/components/home/LastEvent.js");
  expect(card.includes("useEventActionGate"), "LastEvent does not consume hook");
});

check("W2-POLL-FAIL: EventDetails mounts PartialFailureBanner", () => {
  const src = read("halla-mobile/components/events/EventDetails.js");
  expect(src.includes("PartialFailureBanner"), "banner not mounted");
});

// ─── W2-STAFF ─────────────────────────────────────────────────────────────────
check("W2-STAFF: mobile listStaffTokens service + consumer wiring", () => {
  const svc = read("halla-mobile/services/eventsService2.js");
  expect(/export const listStaffTokens/.test(svc),
    "listStaffTokens not exported");
  const stats = read("halla-mobile/components/events/SingleEventStats.js");
  expect(stats.includes("listStaffTokens"), "consumer not wired");
  expect(stats.includes("staffTokensByPhone"), "tokens-by-phone state not added");
  expect(stats.includes("refreshStaffTokens"), "refresh callback not added");
});

// ─── Run + report ─────────────────────────────────────────────────────────────
let pass = 0;
let fail = 0;
for (const c of checks) {
  if (c.ok) {
    pass++;
    process.stdout.write(`PASS  ${c.name}\n`);
  } else {
    fail++;
    process.stdout.write(`FAIL  ${c.name}\n      ${c.error}\n`);
  }
}
process.stdout.write(`\n${pass} / ${pass + fail} PASS\n`);
process.exit(fail === 0 ? 0 : 1);
