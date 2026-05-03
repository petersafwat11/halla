# Phase 4c — Manual Verification Checklist

This file lists the items that the static smoke tests in
`docs/implementation/phase-4c-smoke-tests/static-checks-4c.js` cannot
cover. Static checks confirm the file-level shape; these items confirm
the live behavior end-to-end. Sign each line as it's verified.

---

## Setup

- [ ] **Backend deps installed.** `cd labbe-backend- && npm install`
      pulls in `sharp` + `@aws-sdk/s3-presigned-post`.
- [ ] **Web deps installed.** `cd labbe && npm install` pulls in
      `react-rnd`, `@dnd-kit/core`, `@dnd-kit/sortable`,
      `@dnd-kit/utilities`.
- [ ] **Mobile deps clean.** `cd halla-mobile && npm install` rebuilds
      lockfile without `html-to-image` / `html2canvas`.

## W0-MODEL — Taqnyat templates cache

- [ ] Boot the backend, no errors registering the daily cron.
      Expect log: `Taqnyat-template upstream sync: Daily at 3:30 AM`.
- [ ] As super-admin: `POST /api/v2/admin/taqnyat-templates/sync`.
      Response is `{ success: true, count: <N> }` matching the live
      Taqnyat template count.
- [ ] As super-admin: `GET /api/v2/admin/taqnyat-templates`. Returns
      every synced row with `category: null` initially.
- [ ] As super-admin: `PATCH /api/v2/admin/taqnyat-templates/:id`
      with `{ category: "wedding", varMapping: [{ placeholder: "{{1}}",
      sourceKey: "guest.name" }] }`. Returns the updated doc.
- [ ] As host: `GET /api/v2/taqnyat-templates?category=wedding`
      returns only templates with that category and `active: true`.
- [ ] AuditLog has rows for `taqnyat_template.sync` and
      `taqnyat_template.assign` with the correct actor + targetId.

## W0-VISUAL-BACKEND — Visual templates + categories + S3

- [ ] As admin: `POST /api/v2/admin/templates/upload-url` with
      `{ filename: "wedding.jpg", contentType: "image/jpeg" }`.
      Returns `{ url, fields, s3Key }`.
- [ ] Browser uploads to S3 via the presigned POST.  Response is
      HTTP 204.  Files > 5 MB are rejected by S3 with HTTP 400.
- [ ] `POST /api/v2/admin/templates` with the s3Key + nameEn/Ar +
      categories. Response includes `imageUrl`, `thumbnailUrl`,
      `naturalWidth`, `naturalHeight`.
- [ ] **Orphan cleanup**: simulate a sharp failure (e.g. corrupt
      image). `POST /admin/templates` returns 4xx and the S3 object
      no longer exists (DeleteObjectCommand fired in catch).
- [ ] `GET /api/v2/templates` returns only `active: true` +
      `deletedAt: null` rows, sorted by `sortOrder ASC, createdAt DESC`.
- [ ] `GET /api/v2/template-categories` returns active categories.
      Public (no auth) per v4.1 §A-11.
- [ ] `GET /api/v2/fonts` returns the 6 canonical fonts (no
      displayName fields). Public.
- [ ] AuditLog rows: `template.create / update / delete`,
      `template_category.create / update / delete`.

## W0-RENAME — Event canonical shape + dual-write

- [ ] Create a new event via `POST /api/v2/events`. Inspect the saved
      doc — both `invitationSettings.*` AND `visualTemplate.*`,
      `taqnyatTemplate.*`, `guestReplies.*`, `hostNote` are populated
      where applicable.
- [ ] PATCH `/events/:id/invitation-settings` with the LEGACY shape
      (`{ selectedTemplate: {...}, attendanceAutoReply: "..." }`).
      Read back — canonical fields are also populated.
- [ ] PATCH `/events/:id/invitation-settings` with the CANONICAL shape
      (`{ taqnyatTemplateRef: "...", guestReplies: {...} }`). Read back
      — legacy fields are also populated.
- [ ] **Dry-run migration**: `node scripts/migrate-event-shape.js
      --dry-run` against staging data. Output reports
      `migrated: <N>, unchanged: <M>, errors: 0`. No writes performed.
- [ ] **Apply migration**: `node scripts/migrate-event-shape.js
      --apply` on staging. Random sample of events shows the
      canonical sub-objects populated.

## W0-DYNAMIC — Dynamic body params

- [ ] **Mapped path**: pre-migration event has
      `taqnyatTemplate.templateRef → cached doc with varMapping[]`.
      Send a test message — Taqnyat receives the body params resolved
      from the mapping (e.g. `{{1}}` = guest name, `{{3}}` =
      formatted Riyadh date).
- [ ] **Legacy fallback path**: pre-migration event has only the
      legacy `invitationSettings.selectedTemplate.name`. Send a test
      message — Taqnyat receives the **5-param** legacy shape
      (guestName, eventTitle, formattedDate, time, address).
- [ ] **Auto-reply**: pre-migration event with
      `guestReplies.onAttend` only — guest taps "سأحضر", reply is the
      canonical text. Pre-migration event with only legacy
      `attendanceAutoReply` — same reply text resolves.

## W1-VISUAL — Admin templates editor + StepThree

- [ ] `/admin-dash/templates` loads with the list view. Search,
      category filter, "include inactive" toggle all work.
- [ ] Click "Create new" → editor opens. Upload a JPG. Preview
      appears. Aspect ratio matches the source image.
- [ ] Add 3 fields (text + textarea + color). Add 3 overlays
      pointing at those fieldKeys. Adjust top%/left%/width%/height%
      via the numeric inputs. Save.
- [ ] **Unsaved-changes guard**: dirty form + tab close → browser
      shows leave-confirm. Dirty form + Next.js `<Link>` click → page
      shows leave-confirm. Saving clears the dirty flag.
- [ ] `/admin-dash/templates/categories` — create + edit + soft-delete.
- [ ] Host visits StepThree on web. Sees the new templates in the
      thumbnail grid (no more hardcoded "Classic Wedding" demo).
      Picks a template — `TemplateForm` opens with the dynamic fields
      rendered via `renderField()` (not the legacy hardcoded form).
- [ ] Host fills the form — preview updates live. Saves — baked image
      is uploaded as `templateImage`, persisted as both legacy
      `invitationSettings.templateImage` and canonical
      `visualTemplate.bakedImagePath`.
- [ ] **Whitelabel admin** logged in: navigates to
      `/admin-dash/templates` → 403 redirect (per D4c-3).
- [ ] **Moderator** logged in: can view the list (EDIT level), can
      create + edit, **cannot delete**.

## W1-TAQNYAT-ADMIN

- [ ] `/admin-dash/taqnyat-templates` loads. "Sync from Taqnyat"
      button visible. Super-admin clicks → success toast with count.
- [ ] Pick a template with `{{1}} {{2}} {{3}}` placeholders. Open
      the Assign dialog. Each `{{N}}` shows a source-key dropdown.
      Pick `guest.name` for `{{1}}`, set a fallback. Save.
- [ ] Pick a category. Save. Refresh — assignment persists.
- [ ] Set `active: false`. Refresh the host wizard StepFour — the
      template is no longer in the list.
- [ ] **Admin (non-super)** clicks "Sync" → backend 403 (super-admin
      only). UI shows error toast.

## W1-WIZARD-RENAME — 6-step wizard

- [ ] Stepper shows 6 entries with the new labels (details / guests +
      staff / design invitation / WhatsApp template / messaging /
      review).
- [ ] Step 4 is the Taqnyat picker, filtered by the visual template's
      first category. WhatsApp preview pane shows the picked
      template's body text.
- [ ] Step 5 has the invitation-message textarea + 3 reply tabs +
      host-note input. Editing each reply persists (canonical
      `guestReplies.*` AND legacy `*AutoReply` keys both update).
- [ ] Step 6 = Summary, "Launch" submits.
- [ ] **Web (host)**: end-to-end create → validate event saved with
      both shapes populated.
- [ ] **Web (admin/whitelabel-admin/moderator)**: same wizard, no
      role-specific code path. Create event for a host — works.

## W2-MOBILE-WIZARD — 6-step wizard on mobile

- [ ] Mobile create-event screen shows step 1/6 → 6/6 in the header.
- [ ] Step 4 = Taqnyat picker. Filtered list. Tapping a template saves
      both legacy + canonical fields.
- [ ] Step 5 = messaging tabs + note. Editable replies persist.
- [ ] **`bakeCanvas`**: hook a ViewShot ref around the visual
      preview, call `bakeCanvas(ref)` — returns `{ uri, file }`. The
      file uploads via the multipart endpoint and the resulting URL
      matches the web-baked dimensions for the same template.
- [ ] iOS + Android dev clients build green after dead-dep removal
      (`html-to-image` + `html2canvas` gone).

## W2-MOBILE-RENAME — Read-paths prefer canonical

- [ ] Open an event saved BEFORE the migration ran (legacy-only
      shape). Mobile update-event screen shows existing replies + note
      correctly via the legacy fallback.
- [ ] Open an event saved AFTER the migration ran (canonical
      populated). Mobile update-event shows the same data.
- [ ] **Action-gate**: pre-migration event with only
      `invitationSettings.selectedTemplate.name` → "Send test" + "Schedule"
      buttons enabled. Post-migration event with only
      `taqnyatTemplate.templateRef` → same buttons enabled.

## Cross-cutting

- [ ] Translation keys present in `ar` + `en` for every new copy
      string (search `templates.*`, `taqnyat.*`, `step6_*` etc).
- [ ] RTL admin editor canvas renders correctly under `dir="rtl"`.
- [ ] `/api/fonts` is reachable without auth, returns 6 fonts.
- [ ] Phase 4 / 4b / 3 / 2 / 1 smoke tests still pass (re-run after
      every Phase 4c commit).
- [ ] Phase 4c smoke tests: `node
      docs/implementation/phase-4c-smoke-tests/static-checks-4c.js`
      reports `48/48`.
