#!/usr/bin/env node
/**
 * Phase 4d static contract checks.
 *
 * Run from repo root:
 *   node docs/implementation/phase-4d-smoke-tests/static-checks-4d.js
 *
 * File-level structural checks only — no live server, no React render.
 * Manual verification of the live wizard is in
 * `docs/implementation/PHASE_4D_MANUAL_VERIFICATION.md`.
 *
 * Coverage map per PLAN §3:
 *   W0-ATOMIC                Backend PATCH /events/:id/step2 mounted +
 *                            controller normalises supervisorsList +
 *                            staffList + service uses transaction with
 *                            compensation fallback.
 *   W0-SCHEMAS               @halla/shared-schemas package + workspace
 *                            declaration + re-export shims + drift
 *                            script.
 *   W1-MOBILE-UPDATE         screens/update-event/ tree + 6 new
 *                            mutations + atomic step2 service +
 *                            navigators wired to unified screen.
 *   W1-MOBILE-CREATE-VERIFY  Manual verification doc landed; legacy
 *                            unpack branch dropped from new screen.
 *   W1-WEB-ATOMIC            Web useUpdateEventStep2 mutation registered
 *                            + buildStepPayload returns step2 shape +
 *                            wizard dispatches single PATCH.
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

// ─── W0-ATOMIC ───────────────────────────────────────────────────────────────
check("W0-ATOMIC: PATCH /:id/step2 route mounted with capacity guard", () => {
  const src = read("labbe-backend-/src/modules/events/events.routes.js");
  expect(/router\.patch\(\s*"\/:id\/step2"/.test(src), "/:id/step2 route missing");
  expect(/checkGuestLimit/.test(src), "checkGuestLimit middleware missing");
  expect(/eventsController\.updateEventStep2/.test(src), "controller binding missing");
});

check("W0-ATOMIC: controller normalises supervisorsList + staffList", () => {
  const src = read("labbe-backend-/src/modules/events/events.controller.js");
  expect(/exports\.updateEventStep2/.test(src), "updateEventStep2 export missing");
  expect(/req\.body\.supervisorsList/.test(src), "supervisorsList branch missing");
  expect(/req\.body\.staffList/.test(src), "staffList branch missing");
});

check("W0-ATOMIC: service has transaction + compensation fallback + capacity guard", () => {
  const src = read("labbe-backend-/src/modules/events/events.service.js");
  expect(/async updateEventStep2\(/.test(src), "updateEventStep2 method missing");
  expect(/startSession\(\)/.test(src), "startSession call missing");
  expect(/startTransaction\(\)/.test(src), "startTransaction call missing");
  expect(/commitTransaction/.test(src), "commitTransaction missing");
  expect(/abortTransaction/.test(src), "abortTransaction missing");
  expect(/GUEST_LIST_BELOW_CONFIRMED/.test(src), "capacity guard reuse missing");
  expect(/preImageGuestIds/.test(src), "compensation pre-image variable missing");
  expect(/preImageStaffList/.test(src), "compensation staff pre-image variable missing");
  // The compensation branch should restore the pre-image when the
  // staff save fails AFTER the guest save committed.
  expect(/restoreEvent\.guestList\s*=\s*preImageGuestIds/.test(src), "compensation rollback missing");
});

// ─── W0-SCHEMAS ─────────────────────────────────────────────────────────────
check("W0-SCHEMAS: root package.json declares npm workspaces", () => {
  expect(exists("package.json"), "root package.json missing");
  const pkg = JSON.parse(read("package.json"));
  expect(Array.isArray(pkg.workspaces), "workspaces array missing");
  expect(pkg.workspaces.includes("packages/*"), "packages/* workspace missing");
  expect(pkg.workspaces.includes("labbe"), "labbe workspace missing");
  expect(pkg.workspaces.includes("halla-mobile"), "halla-mobile workspace missing");
});

check("W0-SCHEMAS: @halla/shared-schemas package layout", () => {
  expect(exists("packages/shared-schemas/package.json"), "package.json missing");
  expect(exists("packages/shared-schemas/index.js"), "index.js missing");
  expect(exists("packages/shared-schemas/src/createEventSchema.js"), "createEventSchema source missing");
  expect(exists("packages/shared-schemas/src/updateEventSchema.js"), "updateEventSchema source missing");
  const pkg = JSON.parse(read("packages/shared-schemas/package.json"));
  expect(pkg.name === "@halla/shared-schemas", "package name wrong");
  expect(pkg.private === true, "package should be private");
});

check("W0-SCHEMAS: shared createEventSchema accepts options.fontIds + timeAsDate", () => {
  const src = read("packages/shared-schemas/src/createEventSchema.js");
  expect(/buildDynamicTemplateSchema\s*=\s*\(fields,\s*t,\s*options\s*=\s*\{\}\)/.test(src), "buildDynamicTemplateSchema signature missing");
  expect(/options\.fontIds/.test(src), "fontIds option not consumed");
  expect(/options\.timeAsDate/.test(src), "timeAsDate option not consumed");
  expect(/buildDefaultValues\s*=\s*\(template,\s*parentEventDate,\s*parentEventTime,\s*options\s*=\s*\{\}\)/.test(src), "buildDefaultValues signature missing");
});

check("W0-SCHEMAS: shared updateEventSchema accepts both supervisorsList and staffList", () => {
  const src = read("packages/shared-schemas/src/updateEventSchema.js");
  expect(/updateEventSchema/.test(src), "updateEventSchema export missing");
  expect(/supervisorsList:\s*z\.array/.test(src), "supervisorsList branch missing");
  expect(/staffList:\s*z\.array/.test(src), "staffList branch missing");
  expect(/updateStepValidationSchemas/.test(src), "step-validation schemas missing");
});

check("W0-SCHEMAS: web shim re-exports from @halla/shared-schemas", () => {
  const src = read("labbe/utils/schemas/createEventSchema.js");
  expect(/@halla\/shared-schemas/.test(src), "shared package import missing");
  expect(/buildDynamicTemplateSchemaShared/.test(src), "wrapper alias missing");
  expect(/FONT_IDS/.test(src), "FONT_IDS injection missing");
  // Shim must not contain inline z.object(...) definitions — drift gate.
  expect(!/z\.object\s*\(\s*\{/.test(src), "inline z.object detected in web shim");
});

check("W0-SCHEMAS: web updateEventSchema shim", () => {
  expect(exists("labbe/utils/schemas/updateEventSchema.js"), "web update shim missing");
  const src = read("labbe/utils/schemas/updateEventSchema.js");
  expect(/@halla\/shared-schemas/.test(src), "shared import missing");
  expect(/updateEventSchema/.test(src), "schema export missing");
});

check("W0-SCHEMAS: mobile shim re-exports from @halla/shared-schemas", () => {
  const src = read("halla-mobile/utils/schemas/createEventSchema.js");
  expect(/@halla\/shared-schemas/.test(src), "shared package import missing");
  expect(/timeAsDate:\s*true/.test(src), "mobile timeAsDate flag missing");
  expect(/MOBILE_FONT_IDS/.test(src), "mobile font registry missing");
  expect(!/z\.object\s*\(\s*\{/.test(src), "inline z.object detected in mobile shim");
});

check("W0-SCHEMAS: mobile updateEventSchema shim", () => {
  expect(exists("halla-mobile/utils/schemas/updateEventSchema.js"), "mobile update shim missing");
  const src = read("halla-mobile/utils/schemas/updateEventSchema.js");
  expect(/@halla\/shared-schemas/.test(src), "shared import missing");
});

check("W0-SCHEMAS: workspace deps declared in labbe + halla-mobile", () => {
  const labbe = JSON.parse(read("labbe/package.json"));
  const mobile = JSON.parse(read("halla-mobile/package.json"));
  expect(labbe.dependencies && labbe.dependencies["@halla/shared-schemas"], "labbe missing @halla/shared-schemas dep");
  expect(mobile.dependencies && mobile.dependencies["@halla/shared-schemas"], "halla-mobile missing @halla/shared-schemas dep");
});

check("W0-SCHEMAS: schema-drift script present and executable", () => {
  expect(exists("scripts/check-schema-drift.sh"), "schema-drift script missing");
  const stat = fs.statSync(path.join(ROOT, "scripts/check-schema-drift.sh"));
  // owner-execute bit
  expect((stat.mode & 0o100) !== 0, "schema-drift script not executable");
});

// ─── W1-MOBILE-UPDATE ───────────────────────────────────────────────────────
check("W1-MOBILE-UPDATE: screens/update-event/ tree present", () => {
  for (const f of ["UpdateEventScreen.js", "StepOne.js", "StepTwo.js", "StepThree.js", "StepFour.js", "StepFive.js"]) {
    expect(exists(`halla-mobile/screens/update-event/${f}`), `screens/update-event/${f} missing`);
  }
});

check("W1-MOBILE-UPDATE: unified screen role gates inline + D10 lockout", () => {
  const src = read("halla-mobile/screens/update-event/UpdateEventScreen.js");
  expect(/canEditEvent/.test(src), "role gate helper missing");
  expect(/whitelabel_admin/.test(src), "whitelabel_admin scope missing");
  expect(/whitelabel_moderator/.test(src), "whitelabel_moderator scope missing");
  expect(/super_admin/.test(src), "super_admin scope missing");
  expect(/useEventActionGate/.test(src), "live-event lockout hook missing");
  expect(/lockoutActive/.test(src), "lockout state missing");
  expect(/allowAddOnlyOnStep2/.test(src), "allow-add-only state missing");
});

check("W1-MOBILE-UPDATE: per-step mutation dispatch", () => {
  const src = read("halla-mobile/screens/update-event/UpdateEventScreen.js");
  expect(/useUpdateEvent/.test(src), "useUpdateEvent (step 1) missing");
  expect(/useUpdateEventStep2/.test(src), "useUpdateEventStep2 (step 2) missing");
  expect(/useUpdateVisualTemplate/.test(src), "useUpdateVisualTemplate (step 3) missing");
  expect(/useUpdateTaqnyatTemplate/.test(src), "useUpdateTaqnyatTemplate (step 4) missing");
  expect(/useUpdateMessagingContent/.test(src), "useUpdateMessagingContent (step 5) missing");
});

check("W1-MOBILE-UPDATE: 6 new mutations exported in useEventMutations", () => {
  const src = read("halla-mobile/hooks/mutations/useEventMutations.js");
  for (const name of [
    "useUpdateEventStep2",
    "useUpdateInvitationSettings",
    "useUpdateLaunchSettings",
    "useUpdateVisualTemplate",
    "useUpdateTaqnyatTemplate",
    "useUpdateMessagingContent",
  ]) {
    expect(new RegExp(`export function ${name}\\b`).test(src), `${name} export missing`);
  }
});

check("W1-MOBILE-UPDATE: eventsService2.updateEventStep2 hits /step2", () => {
  const src = read("halla-mobile/services/eventsService2.js");
  expect(/updateEventStep2\s*=\s*async/.test(src), "updateEventStep2 export missing");
  expect(/\/step2/.test(src), "step2 path missing");
});

check("W1-MOBILE-UPDATE: api.config UPDATE_STEP2 endpoint", () => {
  const src = read("halla-mobile/config/api.js");
  expect(/UPDATE_STEP2:.*step2/.test(src), "UPDATE_STEP2 endpoint missing");
});

check("W1-MOBILE-UPDATE: AppNavigator registers unified UpdateEventScreen", () => {
  const src = read("halla-mobile/navigation/AppNavigator.js");
  expect(/screens\/update-event\/UpdateEventScreen/.test(src), "navigator import does not point at unified screen");
  expect(/Stack\.Screen name="UpdateEventScreen"/.test(src), "Stack.Screen entry missing");
});

check("W1-MOBILE-UPDATE: AdminNavigator now uses unified UpdateEventScreen", () => {
  const src = read("halla-mobile/navigation/AdminNavigator.js");
  expect(/screens\/update-event\/UpdateEventScreen/.test(src), "admin navigator import does not point at unified screen");
});

check("W1-MOBILE-UPDATE: legacy host + admin screens are re-export shims", () => {
  const hostSrc = read("halla-mobile/screens/host/UpdateEventScreen.js");
  const adminSrc = read("halla-mobile/screens/admin-dashboard/UpdateEventScreen.js");
  expect(/export.*default.*from.*update-event\/UpdateEventScreen/.test(hostSrc), "host shim is not a re-export");
  expect(/export.*default.*from.*update-event\/UpdateEventScreen/.test(adminSrc), "admin shim is not a re-export");
});

// ─── W1-MOBILE-CREATE-VERIFY ────────────────────────────────────────────────
check("W1-MOBILE-CREATE-VERIFY: new screen drops legacy templateBrideName unpack", () => {
  const src = read("halla-mobile/screens/update-event/UpdateEventScreen.js");
  expect(!/templateBrideName/.test(src), "legacy templateBrideName key still present");
  expect(!/templateGroomName/.test(src), "legacy templateGroomName key still present");
  expect(!/templateGuestMessage/.test(src), "legacy templateGuestMessage key still present");
});

check("W1-MOBILE-CREATE-VERIFY: manual verification doc present", () => {
  expect(exists("docs/implementation/PHASE_4D_MANUAL_VERIFICATION.md"), "manual verification doc missing");
  const src = read("docs/implementation/PHASE_4D_MANUAL_VERIFICATION.md");
  expect(/canonical round-trip/i.test(src), "round-trip section missing");
  expect(/W0-ATOMIC/.test(src), "W0-ATOMIC section missing");
});

// ─── W1-WEB-ATOMIC ──────────────────────────────────────────────────────────
check("W1-WEB-ATOMIC: API_PATHS.events.updateEventStep2 helper", () => {
  const src = read("labbe/services/new-backend/api.config.js");
  expect(/updateEventStep2:.*\/events\/.*\/step2/.test(src), "updateEventStep2 helper missing");
});

check("W1-WEB-ATOMIC: useEventMutation registers updateEventStep2 + exports hook", () => {
  const src = read("labbe/hooks/events/mutations/useEventMutation.js");
  expect(/updateEventStep2:\s*\{/.test(src), "updateEventStep2 mutation block missing");
  expect(/API_PATHS\.events\.updateEventStep2/.test(src), "API_PATHS reference missing");
  expect(/export const useUpdateEventStep2\s*=\s*\(\)\s*=>\s*useEventMutation\("updateEventStep2"\)/.test(src), "convenience hook export missing");
});

check("W1-WEB-ATOMIC: buildStepPayload step 2 returns step2 shape", () => {
  const src = read("labbe/hooks/events/useEventForm.js");
  expect(/type:\s*"step2"/.test(src), "step2 payload type missing");
  expect(/supervisorsList:/.test(src), "supervisorsList key missing");
});

check("W1-WEB-ATOMIC: UpdateEventWizard step 2 dispatches single mutation", () => {
  const src = read("labbe/app/[lang]/host/update-event/_components/UpdateEventWizard.jsx");
  expect(/useUpdateEventStep2/.test(src), "useUpdateEventStep2 import missing");
  expect(/updateEventStep2\.mutateAsync/.test(src), "step2 mutateAsync call missing");
  expect(!/Promise\.all\(\[\s*updateGuestList\.mutateAsync/.test(src), "legacy parallel dispatch still present");
});

// ─── Run / report ────────────────────────────────────────────────────────────
const ok = checks.filter((c) => c.ok).length;
const total = checks.length;
console.log(`\nPhase 4d static checks: ${ok}/${total}\n`);
for (const c of checks) {
  if (c.ok) {
    console.log(`  ✓ ${c.name}`);
  } else {
    console.log(`  ✗ ${c.name}`);
    console.log(`      ${c.error}`);
  }
}
process.exit(ok === total ? 0 : 1);
