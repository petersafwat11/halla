# Phase 4d — Manual Verification Checklist

This file enumerates the checks that need a live environment (web /
mobile / backend running) to confirm. Static smoke tests live in
`docs/implementation/phase-4d-smoke-tests/` and run via Node.

## W0-ATOMIC — `PATCH /events/:id/step2`

- [ ] **Happy path (replica set):** create or pick an event whose
      backing Mongo is a replica set. From the unified web wizard step
      2, change a guest name + add a moderator. Save. Network panel
      shows a single PATCH to `/events/:id/step2` with a `200`.
- [ ] **Atomicity (capacity-guard):** force a payload that should
      reject — e.g. drop the guest list below the confirmed-RSVP count.
      Save. Network panel shows `400 GUEST_LIST_BELOW_CONFIRMED`. Refresh
      the page; `event.guestList` and `event.staffList` both unchanged.
- [ ] **Compensation fallback (standalone):** point the backend at a
      standalone Mongo (no replica set). Repeat the failure-injection
      test. Server logs show the compensation rollback path. DB
      inspection confirms pre-image preserved.
- [ ] **Both naming variants accepted:** issue `curl -X PATCH .../step2`
      with `{ "guestList": [...], "supervisorsList": [...] }` (web
      naming) and again with `{ "guestList": [...], "staffList": [...] }`
      (mobile naming). Both succeed; both end up in
      `event.staffList`.

## W0-SCHEMAS — `@halla/shared-schemas` workspace

- [ ] `npm install` at repo root completes; the workspace symlinks
      `packages/shared-schemas` into `labbe/node_modules/@halla/` and
      `halla-mobile/node_modules/@halla/`.
- [ ] `cd packages/shared-schemas && node -e "require('./')"` — exits 0
      with no error (zod is hoisted from one of the consumers).
- [ ] Web `next dev` boots — confirms Next.js resolves
      `@halla/shared-schemas` through the workspace.
- [ ] Mobile `expo start` boots — confirms Metro resolves the workspace
      package.
- [ ] `bash scripts/check-schema-drift.sh` exits 0 — no inline
      `z.object(...)` redefinitions on the consumer side.
- [ ] Re-run all Phase 4c smoke checks; no regression.

## W1-MOBILE-UPDATE — unified mobile update wizard

- [ ] **Host edits own event:** sign in as a host, tap the home
      "edit" CTA on a non-live event. Wizard opens at the unified
      screen (`screens/update-event/UpdateEventScreen.js`). Walk through
      steps 1–5; each step's save dispatches the correct mutation.
      Navigate back; changes persist on reload.
- [ ] **Admin edits any event:** sign in as `admin`, navigate from
      `AdminEventsScreen` → event → "Edit". Same wizard renders. Verify
      the screen renders the wizard component, not the legacy form.
- [ ] **Whitelabel admin edits same-tenant event:** sign in as
      `whitelabel_admin`, edit an event under their `whitelabelId`.
      Wizard opens. Editing an event from a different tenant returns
      `403` from the client gate (no API call).
- [ ] **Live-event lockout (D10):** force `event.status = 'live'`.
      Reopen the wizard. Steps 1, 3, 4, 5 show the lockout banner and
      disable the form (pointerEvents=none). Step 2 stays interactive,
      can add a new guest, cannot remove existing rows.
- [ ] **Step 2 atomic dispatch:** observe Network — single PATCH to
      `/events/:id/step2` with both lists in the body.
- [ ] **Old import paths still work:** verify `screens/host/UpdateEventScreen`
      and `screens/admin-dashboard/UpdateEventScreen` re-export shims
      resolve — the in-flight bookmarks / push-notification deep-links
      that target the old screen names still navigate.

## W1-MOBILE-CREATE-VERIFY — mobile create-event canonical round-trip

- [ ] Pick a visual template with dynamic fields. Walk through
      create-event steps 1–6. On step 3, customise `brideName`,
      `groomName`, `guestMessage` etc. Confirm.
- [ ] Step 4 — pick a Taqnyat template. Step 5 — set
      `invitationMessage`, `guestReplies.{onAttend,onAbsent,onExpected}`,
      `hostNote`. Step 6 — submit.
- [ ] Inspect the backend write path: the resulting event document has
      canonical sub-objects populated:
      - `event.visualTemplate.templateRef` = template id.
      - `event.visualTemplate.fieldValues` = the customisations
        (keyed by `field.key`, not `templateBrideName`).
      - `event.visualTemplate.bakedImagePath` set to the canvas-bake.
      - `event.taqnyatTemplate.templateRef` = Taqnyat picker id.
      - `event.invitationMessage`, `event.hostNote` top-level.
      - `event.guestReplies.{onAttend,onAbsent,onExpected}`.
- [ ] Reopen the same event in the unified update wizard. Every field
      is pre-populated from the canonical sub-objects. No flat
      `templateBrideName`-style state appears in the form (verify via
      React DevTools).
- [ ] Manually open `Schemas` debug panel: the form's resolver uses
      `@halla/shared-schemas`'s dynamic-schema factory.

## W1-WEB-ATOMIC — web step 2 atomic dispatch

- [ ] Open the web update wizard. Edit step 2 (add a guest, change a
      moderator's phone). Save.
- [ ] Network panel shows one PATCH to `/events/:id/step2`. No parallel
      PATCH to `/guest-list` or `/staff-list`.
- [ ] Force a capacity-guard rejection — for example, drop the guest
      list to one guest after several have already confirmed. Save.
      Toast surfaces the `400 GUEST_LIST_BELOW_CONFIRMED` error. Reload
      the page — `event.guestList` and `event.staffList` both unchanged.

## Overall stop-gate parity

- [ ] All four roles edit an event end-to-end on web AND mobile — the
      same five editable steps render under the same wizard component.
- [ ] Web + mobile both import schemas from `@halla/shared-schemas`
      (verified via `scripts/check-schema-drift.sh`).
- [ ] Branch pushed to `origin/claude/implement-phase-4d-xC9tN`.

When everything is signed off, hand the branch to Peter for review.
