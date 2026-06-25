# Feature Plan — Guest Categories, Reusable Guest Book & Contact Import

> **Status:** proposed plan, ready for build. Authored as senior fullstack + design + QA, grounded in the live code (not the May review docs). Companions: [`01-WEB-FRONTEND`](01-WEB-FRONTEND-event-pages.md), [`02-BACKEND-AND-DB`](02-BACKEND-AND-DB.md).
> **Inputs digested:** the owner's `Halaa_Contact_Import_Implementation_Guide` (PDF, 15 steps) + GPT's `contact-import-architecture.md` + your review comments. I did **not** follow any of them verbatim — this is the connected best-path.

---

## ✅ Implementation status (2026-06-25)

| Layer | Scope | Status |
|---|---|---|
| **Backend** | `category` field + index, email removal, category carry-through (create/step2/guest-list/add/update), Excel export column, **`GET /guests/my-contacts`** guest-book endpoint | **DONE** — `node --check` clean |
| **Web** | email removal, category in payloads, manual-add category combobox, Excel category column, guest-table category column, **"Add from your guests" reuse picker**, **Chrome Contact Picker** (Android-Chrome progressive enhancement), i18n (ar/en) | **DONE** — lint/parse clean |
| **Mobile (expo)** | native `expo-contacts` import + category + reuse picker | **PLANNED** — §8 below, implementation-ready |
| **Web vCard/CSV upload + Google/Microsoft OAuth** | universal/one-click cloud import | **FUTURE** — owner decision (see discussion); not in this build |

Contact-import sources shipped this round: **Chrome Contact Picker** (web, where supported) + **reuse guest book** (web, all browsers) + **Excel** (web, all browsers). Mobile native (`expo-contacts`) is the next track.

---

## 1. The reframe (most important)

The owner's doc calls this **"import from phone contacts."** That framing is wrong for the web host experience, for one hard technical reason:

> **There is no cross-browser way to read phone contacts on the web.** The Web Contact Picker API (`navigator.contacts.select`) is **Android-Chrome-only** — no desktop Chrome, no Firefox, no Safari, no iOS. On the web host pages (the scope you gave me), "import from phone contacts" is a no-op for the large majority of users.

So the real, high-value feature underneath your comments is a **reusable personal guest book with optional categories**. Your own best insight — *"save the past guests for all users with all categories so all is perfect to be reused again in the future"* — is the centerpiece. Phone-contact import is just **one input method, and a mobile-native one**.

**What we actually build:**

| Surface | Web (this scope) | Mobile (parallel track) |
|---|---|---|
| Manual add | + optional **category** dropdown (select or create) | same |
| Excel import/export | + **category** column | n/a |
| **Reuse past guests** (the guest book) | ✅ **new picker modal** — the web "import" story | ✅ same (shared endpoint) |
| Phone contacts | ⚠️ optional progressive enhancement only (Android-Chrome) | ✅ native via `expo-contacts` |
| Email | ❌ **removed entirely** | ❌ removed |

Everything is added to the **existing Step 2 guest surface** (create + update). The single-event page needs **no** new UI — its "Edit guests" button already routes to `update-event?step=2` ([`01` §4](01-WEB-FRONTEND-event-pages.md)).

---

## 2. Architectural decisions (with reasons + what I rejected)

> **Decision A — No new write/import endpoint.** Phone import and reuse are **frontend input methods** that pre-fill the local Step-2 guest list; persistence flows through the **existing** `POST /events` (create) and `PATCH /events/:id/step2` (update).
> **Reason:** `/step2` already does phone-keyed diff (keep/create/update/delete), append-only-when-live, confirmed-floor protection, and **stamp-aware capacity** ([`02` §4b](02-BACKEND-AND-DB.md)). A dedicated import endpoint would *duplicate every one of those rules* and inevitably drift from them. Reuse/import inherit all of it for free.
> **Rejected:** GPT's `POST /events/:id/guests/import-contacts` + `importContactsForEvent` service + `importContactsSchema` (its entire §6 + §7). You were right — it adds complexity with no benefit.

> **Decision B — `category` is an optional free-text label on the Guest, not a model.** No `Category` collection, no CRUD endpoints, no management UI for MVP.
> **Reason:** the only hard requirement is *grouping + reuse*, which a string satisfies. The distinct category list is derived (`distinct` over the host's guests); the manual dropdown offers existing labels + "create new" (= type a string). A collection buys referential integrity and atomic renames at the cost of a model, endpoints, UI, seeding, and orphan-handling — over-engineering for an optional label. This matches your final position.
> **Rejected:** the PDF/GPT **fixed enum** (`family|friends|work|vip|groom_family|bride_family|other`). Hard-coding categories defeats the reuse-across-events value and isn't localizable per host.

> **Decision C — Drop `email` from the entire guest lifecycle.**
> **Reason (verified in code):** `GuestModel` has **no** `email` field; no UI input collects it (manual add + Excel are name+mobile only); `buildEventPayload` just defaults it to `""`; Mongoose strict-mode silently drops it on save; every populate `.select("…email…")` returns `undefined`; **no exporter, post-event flow, or cell renderer reads it.** It is a phantom. Removal is pure cleanup with **zero data migration**.
> **Rejected:** keeping `email?` "just in case" (GPT/PDF). It's dead weight.

> **Decision D — Reuse needs exactly ONE new endpoint, and it's read-only.** `GET /guests/my-contacts` returns the host's past guests (deduped by phone), with optional `search` + `category` filters + the distinct category list.
> **Reason:** nothing today returns a host's **cross-event** guest history — every existing guest query is event-scoped. This is unavoidable and is the only genuinely new backend surface. It touches no event, no quota, no writes.
> **Rejected:** `source` field (`manual|excel_import|phone_import`) and `importMeta` — you asked "doesn't add any value?" and you're right: nothing in reuse, sending, or display depends on them. YAGNI. (Trivial to add later if analytics ever want provenance.)

---

## 3. Two product forks — my recommendation, your call

> **Fork 1 — Category management (rename/delete categories as a first-class action).**
> You asked for an add/remove/update-category UI early, then reversed to "no model/CRUD/UI needed." **I recommend DEFER (no management UI for MVP).** Categories emerge from guests; "create" = label a guest; the dropdown surfaces existing labels to prevent fragmentation. If you later want true rename/delete, it's a pair of **bulk operations over the guest collection** (`updateMany({host's guests, category:'X'}, {category:'Y'})`) — still **no model**. ✅ Confirm you're OK shipping without category management.

> **Fork 2 — Web phone-contact picker (`navigator.contacts`).**
> **I recommend DEFER to a later phase** (progressive enhancement behind feature-detection). It works only on Android Chrome, so it's low ROI and the reuse-guest-book + Excel already cover the web "import" need. ✅ Confirm web ships without it (mobile still gets full native import).

Both are "recommend defer." If you disagree on either, say so and I'll fold it into Phase scope.

---

## 4. Disposition of every input (so nothing is silently dropped)

| Source item | Disposition | Why |
|---|---|---|
| Your: drop email everywhere | ✅ **Accepted** | Phantom field, verified dead. |
| Your: categories reusable, linked to the user's guests | ✅ **Accepted, centered** | This is the core feature. |
| Your: manual add → category dropdown w/ create | ✅ **Accepted** | Creatable combobox from distinct labels. |
| Your: CSV import/export carries category column | ✅ **Accepted** | Extend existing XLSX template + parser. |
| Your: "add past guests" popup w/ table + category filter | ✅ **Accepted, centered** | The reuse modal (Decision D). |
| Your: category optional everywhere | ✅ **Accepted** | `default: undefined`, never required. |
| Your: drop `source` field | ✅ **Accepted** | No value (Decision D). |
| Your: drop the import endpoint + §6/§7 backend | ✅ **Accepted** | Decision A — reuse existing create/step2. |
| Your: separate category model/CRUD/UI | ⚖️ **Refined** | No model (Decision B); management UI deferred (Fork 1). |
| Your: reuse the existing validation | ✅ **Accepted** | Only *declare* category in the strict Zod guest schema so it persists — no new validation logic. |
| GPT: fixed category enum | ❌ **Rejected** | Free-text label (Decision B). |
| GPT: `category` default `'other'` | ❌ **Rejected** | Optional/undefined; "other" pollutes the reuse list. |
| GPT/PDF: Flutter / `flutter_contacts` | ❌ **Corrected** | Mobile is **React Native / Expo** → `expo-contacts`. |
| GPT: import on single-event guest table | ❌ **Rejected (unneeded)** | "Edit guests" routes to update step 2 already. |
| GPT: status mapping table (not_sent/pending/…) | ✅ **Accepted as-is** | Existing GuestModel defaults already cover it; no new fields. |
| PDF: privacy (never upload full phonebook) | ✅ **Accepted (mobile)** | Native track only sends user-selected contacts. |

---

## 5. Data model changes (minimal)

### 5.1 `GuestModel.js`
- **Add** one field:
  ```js
  category: { type: String, trim: true, maxlength: 60, default: undefined }, // optional, free-text label
  ```
- **Add** indexes for the reuse query path (currently only event-scoped indexes exist, [`GuestModel.js:223-232`](labbe-backend-/models/GuestModel.js)):
  ```js
  guestSchema.index({ event: 1, category: 1 });   // category filter within an event set
  // (reuse scopes by the host's events via the existing { event: 1 } index — see §6.3)
  ```
- **No `email`** to remove here (it was never in the schema). **No migration** — `category` is absent on old docs and reads as `undefined`.

> **Category fragmentation** ("Family" vs "family"): store the display string as typed; group **case-insensitively** in the reuse aggregation and surface existing labels in the dropdown. If fragmentation becomes real, add a denormalized `categoryKey` (lowercased) later — not needed for MVP.

> **Reuse creates NEW guest docs.** Guests are per-event; the reuse picker **copies** name/phone/category into the new event's list — it does not link to old guest docs. Category is therefore a per-occurrence label (the picker shows the most-recent one per phone), not a stable per-person attribute. Promoting to a real per-user Contact/address-book entity is a deliberate future option, explicitly out of MVP.

---

## 6. Backend changes

### 6.1 Drop email (cleanup only — exact surface, all verified)
| File | Change |
|---|---|
| [`events.validation.js:27`](labbe-backend-/src/modules/events/events.validation.js) | remove `email: z.string().email()...` from the guest-item schema |
| [`events.guests.service.js:235-247`](labbe-backend-/src/modules/events/events.guests.service.js) | drop the `email` comparison/write in the step2 diff |
| [`events.guests.service.js:120,171,287`](labbe-backend-/src/modules/events/events.guests.service.js) | change `.select("name email phone status")` → `"name phone status category"` |

### 6.2 Add `category` (declare so it persists — not new validation logic)
| File | Change |
|---|---|
| `events.validation.js` | add `category: z.string().trim().max(60).optional()` to the **strict** guest-item schema used by `createEventSchema.guestList[]`, `updateStep2Schema`, `updateGuestListSchema`, and `addGuestSchema` (else strict mode strips/rejects it) |
| [`events.guests.service.js:46-53`](labbe-backend-/src/modules/events/events.guests.service.js) (`createGuestsFromList`) | carry `category: guest.category` into the created doc |
| `events.guests.service.js` step2 diff (`updateEventStep2`) | include `category` in create + treat a category change as an update |
| `guests.service.js` `addGuest` / `updateGuest` | allow `category` in the create + the updatable-fields whitelist |

### 6.3 New read endpoint — the guest book
**`GET /guests/my-contacts`** (host-scoped, read-only). Add to `guests.routes.js` (under `protect`), `guests.controller.js`, `guests.service.js`.

- **Query:** `search?` (name/phone regex), `category?`, `page?`, `limit?`.
- **Scope by the host's own events, not `addedBy`** (admin-on-behalf guests still belong to the host):
  ```js
  const eventIds = await Event.find({ host: userId, status: { $ne: 'deleted' } }).distinct('_id');
  // aggregate Guest: match { event:{$in:eventIds}, deleted:{$ne:true}, ...category, ...search }
  //   → sort createdAt:-1 → group by $phone (first name/category/createdAt, count) → sort lastUsedAt:-1 → skip/limit
  const categories = await Guest.distinct('category', { event:{$in:eventIds}, deleted:{$ne:true}, category:{$ne:null} });
  ```
- **Response:** `{ status:'success', data:{ contacts:[{name,phone,category,lastUsedAt,eventCount}], categories:[...], pagination } }`.
- **No quota, no event mutation, no writes.** Uses the existing `Event {host:1}` and `Guest {event:1}` indexes.

> **Phone-key caveat:** dedupe groups on the stored `phone`. Frontend enforces `^5[0-9]{8}$`, so new data is canonical 9-digit; if legacy data varies, the group is best-effort (acceptable for MVP). Don't normalize in-pipeline unless we see fragmentation.

---

## 7. Frontend changes (web)

### 7.1 Email removal + category in the form contract
| File | Change |
|---|---|
| [`useEventForm.js:51,153,365`](labbe/hooks/events/useEventForm.js) | remove `email` from `mapEventToFormValues`, `buildEventPayload`, `transformGuestList`; **add** `category` to each (carry through create + step2 payloads) |
| guest item type / defaults | `FormGuest = { id, name, mobile, category? }` (drop `email`) |

### 7.2 Step 2 guest surface (shared by create + update)
| File | Change |
|---|---|
| [`stepTwo/GuestImporter.js:106-138`](labbe/app/[lang]/host/create-event/_components/stepTwo/GuestImporter.js) | **Manual add:** add an optional **category combobox** (creatable; options = `useMyGuestCategories()` ∪ current-list distinct). **Excel:** add a `category` column to the template export (`headers`) and the import parser; map it into guest items; validate optional (trim/cap), reuse existing row-validation flow. |
| `stepTwo/GuestTable.js` | add a **Category** column (display; edit via the existing row-edit affordance). |
| `stepTwo/StepTwo.js` | add the **"Add from your guests"** button next to Add-manual / Upload-Excel, opening the reuse modal. |

### 7.3 Reuse picker (the centerpiece) — new, shared
- **Component:** `labbe/components/guests/reuseGuests/ReuseGuestsModal.jsx` (used by create Step 2 + update Step 2).
- **Hooks:** `hooks/guests/queries.js` → `useMyContacts({search,category,page})`, `useMyGuestCategories()` (keys under `guestsKeys`).
- **Behavior (parity with the Excel path):** searchable + category-filter table; per-row Add + **select-all/bulk-add**; **dedupe against the current list by normalized phone** and **disable already-added rows**; **respect + show remaining capacity** (mirror `GuestImporter`'s truncate-to-remaining, since list cap is inherited at save); on add → `setValue('guestList', merged, {shouldDirty:true})`. **Empty state** (first-time host, no past guests) → point to manual/Excel. Then Save (update) / Next→submit (create) persists via the existing endpoints.

### 7.4 Web phone import — Chrome Contact Picker ✅ (implemented)
File: [`labbe/utils/contacts/phoneContacts.js`](../../labbe/utils/contacts/phoneContacts.js).
- `isContactPickerSupported()` — feature-detects `navigator.contacts.select` **and** `window.isSecureContext`. `StepTwo` resolves it in a `useEffect` (not during render) to avoid an SSR/hydration mismatch, and only shows the **"Import from contacts"** button when true (Android Chrome / Chromium-mobile). On every other browser the button is simply absent — Excel + reuse cover them.
- `pickPhoneContacts()` opens the OS picker (`{ multiple: true }`), maps each selected contact to `{ name, mobile }` via `normalizeSaudiMobile()` (first valid Saudi number wins), and drops entries without a valid mobile. The browser returns **only the user-selected entries — never the full phonebook**.
- Selected contacts flow through the **same** `mergeIncomingGuests()` path as the reuse picker (dedupe by phone, capacity-truncate, skipped-count popup), then persist via the normal create/step2 save.
- `normalizeSaudiMobile()` is shared and canonicalises `+966…/966…/0…/…` → `5xxxxxxxx`.

---

## 8. Mobile native import — Expo (`expo-contacts`) — implementation-ready spec

Mobile (`halla-mobile/`, **React Native / Expo**, Cairo-only) gets the **real** native phonebook import — the heart of the client's original ask. This is the one place a true device-contacts read is possible. It reuses the same backend (no new endpoint) and the same guest-book endpoint as web.

> ⚠️ `halla-mobile/hooks/events/useEventForm.js` and `components/createEvent/StepTwo.js` are currently in active local WIP (`git status` shows them modified). Land/commit that WIP first so these changes apply cleanly.

### 8.1 Dependency + native config
- `npx expo install expo-contacts` (managed workflow — adds the dependency and is config-plugin aware).
- `app.json` → add the config plugin with copy that matches the web pre-permission sheet:
  ```json
  ["expo-contacts", { "contactsPermission": "نستخدم جهات اتصالك فقط لتختار ضيوف هذه المناسبة. لا نرفع دفتر هاتفك." }]
  ```
  This generates Android `READ_CONTACTS` + iOS `NSContactsUsageDescription`. Rebuild the dev client (contacts is native — Expo Go won't pick up the new permission).

### 8.2 Files to add
| File | Responsibility |
|---|---|
| `halla-mobile/utils/contacts/phoneContacts.js` | `requestAndPickContacts()` — `Contacts.requestPermissionsAsync()` → `Contacts.getContactsAsync({ fields: [Name, PhoneNumbers] })` → return `{ name, phones[] }[]`. Plus `normalizeSaudiMobile()` (copy of the web util — identical canonicalisation). Extract **name + phone only**. |
| `halla-mobile/components/createEvent/_components/PermissionSheet.js` | Pre-permission explanation modal ("we only access contacts so you can pick guests; we never upload your phonebook" + Continue/Cancel) shown **before** the OS prompt. |
| `halla-mobile/components/createEvent/_components/ContactsPickerModal.js` | Searchable, multi-select list of device contacts (pick one number when a contact has several) + a category selector applied to the selection. On confirm → `mergeIncomingGuests`. |
| `halla-mobile/components/guests/ReuseGuestsModal.js` | Mobile twin of the web reuse picker; consumes `useMyContacts` (add the hook to mobile's `hooks/guests`). |
| `halla-mobile/utils/guests/mergeIncomingGuests.js` | Shared dedupe-by-phone + capacity-truncate (mirror of the web `mergeIncomingGuests` in `StepTwo.js`). |

### 8.3 Files to change (mirror the web edits)
- `hooks/events/useEventForm.js` — drop `email`, add `category` in `transformGuestList` / `buildEventPayload` / `buildStepPayload` (exactly as web [`useEventForm.js`](../../labbe/hooks/events/useEventForm.js)).
- `components/createEvent/_components/GuestForm.js` — add an optional **category** input (a simple text input + suggestions from the guest book; RN has no `<datalist>`, so use a lightweight autocomplete or a "recent categories" chip row).
- `components/createEvent/ListOfGuestsORModerators.js` — show the category on each guest row.
- `components/createEvent/StepTwo.js` (+ `screens/common/update-event/StepTwo.js`) — add **"Import from contacts"** and **"Add from your guests"** buttons that open the two modals; both call `mergeIncomingGuests` then persist via the existing create/step2 save (no import endpoint).
- `hooks/guests/` — add `useMyContacts` (same `GET /guests/my-contacts`, same React Query shape as web).

### 8.4 Rules (identical to web)
- Extract **name + phone only**; never send unselected contacts; no background sync, no full-phonebook upload (PDF §11/§14).
- Saudi-normalize + dedupe by phone against the current list; respect the remaining list cap (free at list time).
- Category optional, free-text, reused via the guest book.
- Live event = append-only; completed = locked — inherited from the existing step2 path.

---

## 9. QA / test plan (senior QA)

**Inherited-for-free (assert they still hold via the existing path):**
- List cap enforced at save (free at list time — `invitesConsumed` **unchanged** by add/reuse/import).
- Live event = append-only (existing rows read-only); completed/cancelled = locked.
- Phone dedupe by normalized number across current list + step2 diff.

**New behavior:**
- `category` persists through create (`POST /events`) and update (`PATCH /step2`); optional (absent is valid); round-trips through Excel export→import.
- Email fully gone: no `email` in payloads, schemas, populates, or UI; existing events with no stored email are unaffected.
- `GET /guests/my-contacts`: returns only the requesting host's guests (no cross-tenant leak); dedupes by phone; `search` + `category` filter; pagination; distinct categories list; empty for a brand-new host.
- Reuse merge: dedupes against current list, disables already-added rows, truncates to remaining capacity, marks the overflow.
- i18n: Arabic + English for category labels, the new column, Excel header, reuse modal, empty states.

**Edge cases:** contact with multiple numbers (mobile picks first valid Saudi mobile); same phone different names (treated as one person in reuse); category case variants surface together in the dropdown; a host with thousands of guests (paginated, indexed).

---

## 10. Phased sequence (ships a spine early)

| Phase | Deliverable | Status |
|---|---|---|
| **1 — BE field + cleanup** | `GuestModel.category` + indexes; Zod declares `category`; service carry-through; **email removal**. | ✅ DONE |
| **2 — Reuse read endpoint** | `GET /guests/my-contacts`. | ✅ DONE |
| **3 — FE category UI** | manual combobox, table column, Excel column, email removal in `useEventForm`. | ✅ DONE |
| **4 — Reuse picker** | `ReuseGuestsModal` + `useMyContacts`, wired into create + update Step 2. **(the headline value)** | ✅ DONE |
| **5 — Web phone picker** | Chrome Contact Picker, feature-detected progressive enhancement. | ✅ DONE |
| **6 — Mobile native import** | `expo-contacts` track (§8). | ⏳ NEXT |
| **7 — (future) web cloud import** | vCard/CSV upload + Google/Microsoft OAuth. | 🔮 owner decision |

Phases 1–5 (web + backend) are complete and verified. Phase 6 (mobile) is spec'd in §8 and ready to build once the mobile WIP lands. Phase 7 is the future cross-browser cloud-import layer for the owner to decide on.

---

## 11. Exact file-change inventory

**Backend** — `GuestModel.js` (category + indexes), `events/events.validation.js` (drop email, add category), `events/events.guests.service.js` (carry category, drop email refs/select), `guests/guests.service.js` + `guests.controller.js` + `guests.routes.js` (add `category` to add/update; **new** `getMyContacts`). **No new model, no new write endpoint, no migration.**

**Frontend (web)** — `hooks/events/useEventForm.js` (email→category in 3 builders), `hooks/guests/queries.js` + `keys.js` (`useMyContacts`, `useMyGuestCategories`), `stepTwo/GuestImporter.js` (category dropdown + Excel column), `stepTwo/GuestTable.js` (category column), `stepTwo/StepTwo.js` (reuse button), **new** `components/guests/reuseGuests/ReuseGuestsModal.jsx`. Single-event page: **no change** (delegates to update step 2).

**Mobile (parallel)** — `expo-contacts` integration + selection UI + reuse picker reusing the shared endpoint.
