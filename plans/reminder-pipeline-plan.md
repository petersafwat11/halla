# Reminder Pipeline & Scheduled Extra Reminders — Implementation Plan

> Owner: lead engineer
> Status: pre-implementation (approved scope, awaiting go)
> Last updated: 2026-05-21 (revision 2 — applied advisor review fixes)

## Revision history

**rev-2 (2026-05-21)** — Critical-review pass. Changes:
- §3.1 — Removed invalid Mongo partial unique index using `$in` (not supported); rely on the atomic service-level deactivation in §4.2 instead. Kept lookup indexes only.
- §6.1 — Replaced brittle `event.__staffContext` mutation pattern with an explicit `extraContext` parameter on `getEventBodyParams`/`getPostEventBodyParams`.
- §8.1 — Staff service now passes a local per-iteration `staffCtx` argument instead of mutating the event.
- §9.4/§9.5 — Replaced reference to nonexistent `events.findScopedOrThrow` with the real `eventsService.getEventById(eventId, user)` (which already enforces scoping via `_buildScopedEventQuery`).
- §9.6 — Added the explicit atomic `findOneAndUpdate({status:'pending'} → 'running')` claim block.
- §9.6 — Added Taqnyat 429 refund-safety note.
- §9.8 (NEW) — Enrich `GET /events/:id` response with the event-owner's `subscription.remindersRemaining/Pool/Consumed/Reserved`. Critical so platform admins viewing a host's event see the host's quota, not their own.
- §10.4 — Visibility gate now reads `event.subscription.remindersRemaining` (not viewer's hook), and additionally requires a valid send window AND `event.subscriptionId`.
- §10.4 / §12.4 — Mobile gate aligned with web.
- §13.3 — Dropped tab-key normalization (cosmetic churn, persisted data is already consistent).
- §16 — Expanded ops checklist (every event category needs reminder templates), added pricing-migration note.
- File-by-file index — added row 22b (events.crud enrichment), updated shared-component path to `labbe/components/event-detail/` (matches existing `labbe/components/shared/` convention; no `_shared` precedent in repo).

---

## 0. Scope summary (what we are building)

1. **Category-driven Taqnyat template assignment.** Each event category gets templates assigned per *type*: `invite` (many allowed per category — host picks one in step 4), `reminder_pending` (exactly one active per category — for guests who haven't responded or chose maybe), `reminder_confirmed` (exactly one per category — for confirmed guests), `post_event` (one per category), `staff_access` (one global). Admins curate this in the existing `AssignTaqnyatTemplatePopup` with a new **Type** dropdown.
2. **24h-before auto reminders** — rewire the existing cron so it stops using hardcoded template names (`halaa_reminder_confirmed`, `halaa_reminder_declined`, `halaa_reminder_nudge`) and instead looks up `(category, type)` from `TaqnyatTemplate`. **Drop the `declined` branch entirely.** Fold `maybe` into the same pending branch as `no_response`. Per-guest tracking columns added.
3. **Google Maps location in WhatsApp body** — add a new resolvable source key `eventDetails.location.mapUrl` that returns `https://maps.google.com/?q=<lat>,<lng>` (or empty if missing). Admins opt-in by mapping a placeholder to this key in the assign popup.
4. **Staff WhatsApp template** — replace the hand-rolled SMS in `events.staff.service.js` with a Taqnyat template lookup (`type='staff_access'`), with new source keys `staff.name` and `staff.accessUrl`. SMS remains as fallback.
5. **Add-on pricing migration** — `EXTRA_REMINDERS_TIERS` is rewritten to mirror `EXTRA_INVITES_TIERS` (same quantities, same prices). The old tiers are deleted (we're still in dev, no backwards compat).
6. **Extra reminders quota tracking** — `extra_reminders` gets first-class quota tracking on `Subscription` (mirrors `invitePool`/`invitesConsumed`). 1 reminder = 1 message to 1 guest.
7. **Schedule extra reminders feature** — new model + endpoints + cron + UI. From the single event page (web host, web admin, mobile), the event owner (host or whitelabel business) can schedule an extra reminder for a subset of guests if they've purchased extras. Schedulable window: `[now+5min, eventDate−24h]`. Platform-wide admins/moderators see the same UI on events they're permitted to view — they consume the owner's quota.
8. **Guest table** — two new columns: "Auto reminder" (✓ with timestamp) and "Extra reminder" (scheduled / sent / —).
9. **Mobile unification** — mobile host event detail (currently rendered inline inside `EventsScreen` via the legacy `components/events/EventDetails.js`) is migrated to the modern stack-route screen used by admin (`screens/admin/admin-dashboard/EventDetailsScreen.js`). The legacy component and inline-modal state machine are deleted.
10. **Web unification** — host and admin single-event pages render identical content via shared components. The only difference is the `requirePageAccess` guard on the admin route and small role-dependent props (e.g. host selector visibility, "view-as" badges). Same for create-event.
11. **Localization** — add EN+AR keys across web + mobile for everything new; remove obsolete keys.

**Scope of work**: backend models/migrations/services/cron + admin UI + web host UI + web admin UI + mobile UI + localization.

---

## 1. Locked decisions (assumptions confirmed by user)

| # | Decision |
|---|---|
| 1 | `staff_access` is a new template type, single global active template (no per-category enforcement). |
| 2 | Admin scheduling on behalf of host: audit records both `actor` (admin) and `metadata.onBehalfOfHost = hostId`. |
| 3 | Cancelling a `pending` scheduled extra reminder fully refunds quota. `running` cannot be cancelled. |
| 4 | The 24h auto-reminder is free (covered by base plan). Only manually-scheduled extras consume the purchased quota. |
| 5 | **No backwards compatibility for `EXTRA_REMINDERS_TIERS`** — old prices/tiers are deleted, not coexisted. Project is still in dev. |
| 6 | Visibility: "Schedule Reminder" button is visible iff the *event owner* (host or whitelabel business that owns the event) has remaining extra-reminder quota. Platform-wide admins see the page exactly as the owner sees it; they consume the owner's quota when they act. Whitelabel-scoped staff only see their own business's events. |
| 7 | Schedule window: `[now+5min, eventDate−24h]`. Cannot be after the auto-reminder boundary or before the invite has gone out. |
| 8 | `post_event` is a recognised type now but no templates are added in this iteration. |
| 9 | Mobile host event detail migrates to the admin structure. Legacy inline modal pattern and `components/events/EventDetails.js` are deleted. |
| 10 | Type enum values: `invite`, `reminder_confirmed`, `reminder_pending`, `post_event`, `staff_access`. |

---

## 2. Architecture diagram (logical)

```
                   ┌─────────────────────────────┐
                   │  Admin dashboard / Taqnyat  │
                   │  Assign popup (UI)          │
                   │   - category dropdown       │
                   │   - TYPE dropdown (NEW)     │
                   │   - varMapping editor       │
                   └────────────┬────────────────┘
                                │ PATCH /admin/taqnyat-templates/:id
                                ▼
            ┌──────────────────────────────────────────┐
            │  taqnyat-templates.service.assignMapping │
            │   - if type in {reminder_*, post_event,  │
            │     staff_access}: enforce uniqueness    │
            │     per (category,type) by deactivating  │
            │     the previous one in a transaction.    │
            └──────────────┬───────────────────────────┘
                           ▼
                  ┌───────────────────┐
                  │ TaqnyatTemplate   │
                  │  + type field     │
                  └─────────┬─────────┘
                            │ looked up by (category, type)
        ┌───────────────────┼──────────────────────────┐
        │                   │                          │
        ▼                   ▼                          ▼
 Create-event Step 4    Auto-reminder cron     Extra-reminder cron (NEW)
 (host picks invite)   (24h before, segmented)  (fires at scheduledFor)
        │                   │                          │
        └──────► messaging.send → taqnyat.sendWhatsAppTemplate(…) ─┐
                                                                    │
                       Guest.invitation: writes per-guest tracking ◄┘
                                                                    │
                  Subscription.remindersConsumed atomically + 1  ◄──┘
```

---

## 3. Phase 1 — Data model changes & migrations

### 3.1 `TaqnyatTemplate` — add `type` field

**File:** `labbe-backend-/models/TaqnyatTemplateModel.js`

Insert after `category` (after line 54):

```js
/**
 * Template purpose within a category. Drives the cron + create-event picker:
 *  - 'invite' → many allowed per (category); host picks one in step 4
 *  - 'reminder_confirmed' → exactly one active per category; 24h cron uses it
 *  - 'reminder_pending' → exactly one active per category; 24h cron + scheduled
 *                          extra reminders for {no_response, maybe} segment
 *  - 'post_event' → one active per category; post-event messaging
 *  - 'staff_access' → one active GLOBAL (category may be null); staff notify
 */
type: {
  type: String,
  enum: ['invite', 'reminder_confirmed', 'reminder_pending', 'post_event', 'staff_access'],
  default: null,
  index: true,
},
```

**Index changes (lines 92-94 area):**

- Remove `taqnyatTemplateSchema.index({ category: 1, active: 1, status: 1 });`
- Add (non-unique lookup index only — uniqueness is enforced at service layer in §4.2, atomically deactivating the previous active doc on assign):
  ```js
  taqnyatTemplateSchema.index({ category: 1, type: 1, active: 1, status: 1 });
  taqnyatTemplateSchema.index({ type: 1, active: 1, status: 1 });
  ```

> **Why no DB-level partial unique index?** `partialFilterExpression` does not support `$in`, so we cannot express "unique per (category,type) for type IN {reminder_confirmed, reminder_pending, post_event}" in a single index. The alternative — four separate partial unique indexes — adds maintenance cost and offers no real safety beyond the atomic service-level write in §4.2 (`assignMapping` deactivates the previous active row in the same DB round-trip before flipping the new one to active). Belt without suspenders is sufficient here.

### 3.2 Migration script — backfill existing assignments

**New file:** `labbe-backend-/migrations/2026-05-21_template_types.js`

```js
/**
 * Backfill TaqnyatTemplate.type for already-assigned templates.
 * Convention: anything assigned before now is treated as 'invite' — admins will
 * re-tag the reminders/post-event/staff manually in the new Assign popup.
 */
const mongoose = require('mongoose');
const TaqnyatTemplate = require('../models/TaqnyatTemplateModel');

async function up() {
  await TaqnyatTemplate.updateMany(
    { type: { $in: [null, undefined] }, category: { $ne: null } },
    { $set: { type: 'invite' } }
  );
}

if (require.main === module) {
  mongoose.connect(process.env.MONGODB_URI).then(async () => {
    await up();
    console.log('Backfill complete');
    process.exit(0);
  });
}

module.exports = { up };
```

Add to migration runner registry per existing convention (locate via existing files under `labbe-backend-/migrations/`).

### 3.3 Add-on pricing migration

**File:** `labbe-backend-/src/shared/constants/addons.js`

Replace lines 16-22:

```js
// Mirror EXTRA_INVITES_TIERS exactly. 1 reminder = 1 guest message.
const EXTRA_REMINDERS_TIERS = [
  { quantity: 10, price: 40 },
  { quantity: 20, price: 75 },
  { quantity: 30, price: 105 },
  { quantity: 40, price: 130 },
  { quantity: 50, price: 150 },
];
```

(No backwards-compat. Old historical Addon rows keep their stored `quantity`/`price`; only catalog and new purchases use these.)

### 3.4 Extra-reminder quota — add Subscription fields

**File:** `labbe-backend-/models/SubscriptionModel.js`

Add fields (next to `invitePool`/`invitesConsumed`):

```js
remindersPool: { type: Number, default: 0 },     // from purchased extra_reminders addons
remindersConsumed: { type: Number, default: 0 },
remindersReserved: { type: Number, default: 0 }, // currently scheduled but not yet sent
```

Add virtual (next to `invitesRemaining`):

```js
subscriptionSchema.virtual('remindersRemaining').get(function () {
  return (this.remindersPool || 0) - (this.remindersConsumed || 0) - (this.remindersReserved || 0);
});
```

Add static methods (mirror `consumeInvites`/`releaseInvites`):

```js
subscriptionSchema.statics.reserveReminders = async function (subscriptionId, count) {
  const res = await this.findOneAndUpdate(
    {
      _id: subscriptionId,
      $expr: {
        $gte: [
          { $subtract: [
            { $subtract: [{ $ifNull: ['$remindersPool', 0] }, { $ifNull: ['$remindersConsumed', 0] }] },
            { $ifNull: ['$remindersReserved', 0] },
          ] },
          count,
        ],
      },
    },
    { $inc: { remindersReserved: count } },
    { new: true }
  );
  if (!res) throw new Error('INSUFFICIENT_REMINDER_QUOTA');
  return res;
};

subscriptionSchema.statics.releaseReservedReminders = async function (subscriptionId, count) {
  return this.findOneAndUpdate(
    { _id: subscriptionId },
    { $inc: { remindersReserved: -count } },
    { new: true }
  );
};

subscriptionSchema.statics.consumeReservedReminders = async function (subscriptionId, count) {
  return this.findOneAndUpdate(
    { _id: subscriptionId },
    { $inc: { remindersReserved: -count, remindersConsumed: count } },
    { new: true }
  );
};
```

### 3.5 Wire `extra_reminders` into addon quota application

**File:** `labbe-backend-/src/modules/addons/addons.quota.js`

Currently only `extra_invites` is handled (comment at lines 8-9 acknowledges). Add an `if (addon.addonType === ADDON_TYPES.EXTRA_REMINDERS)` branch:

```js
if (addon.addonType === ADDON_TYPES.EXTRA_REMINDERS) {
  // Always subscription-scoped (per user's design decision)
  await Subscription.findByIdAndUpdate(
    addon.subscriptionId,
    { $inc: { remindersPool: addon.quantity } }
  );
  return;
}
```

### 3.6 Event model — per-guest reminder tracking

**File:** `labbe-backend-/models/EventModel.js`

(No direct field on Event; per-guest fields live on Guest.)

**Optional**: under `messagingStatusSchema`, add `reminderSentAt: Date` for diagnostic. Keep existing `reminderSent: Boolean` flag.

### 3.7 Guest model — per-guest reminder tracking

**File:** `labbe-backend-/models/GuestModel.js`

Extend `invitationSchema` (after line 178):

```js
// 24h auto-reminder
autoReminderSent: { type: Boolean, default: false },
autoReminderSentAt: { type: Date },
autoReminderType: { type: String, enum: ['reminder_confirmed', 'reminder_pending'] },
autoReminderMessageId: { type: String },

// Purchased extra reminder
extraReminderScheduled: { type: Boolean, default: false },
extraReminderScheduledFor: { type: Date },
extraReminderSent: { type: Boolean, default: false },
extraReminderSentAt: { type: Date },
extraReminderType: { type: String, enum: ['reminder_confirmed', 'reminder_pending'] },
extraReminderMessageId: { type: String },
extraReminderDocId: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduledExtraReminder' },
```

### 3.8 New model — `ScheduledExtraReminder`

**New file:** `labbe-backend-/models/ScheduledExtraReminderModel.js`

```js
const mongoose = require('mongoose');

const detailSchema = new mongoose.Schema(
  {
    guestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guest', required: true },
    success: { type: Boolean },
    messageId: { type: String },
    error: { type: String },
    rateLimited: { type: Boolean, default: false },
  },
  { _id: false }
);

const scheduledExtraReminderSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true, index: true },
    eventOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdBy: {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      role: { type: String, required: true },
      onBehalfOfOwner: { type: Boolean, default: false },
    },
    reminderType: { type: String, enum: ['reminder_confirmed', 'reminder_pending'], required: true },
    guestIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    scheduledFor: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'running', 'sent', 'partial', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    consumedQuota: { type: Number, required: true }, // = guestIds.length at schedule time
    result: {
      successful: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      rateLimited: { type: Number, default: 0 },
      details: { type: [detailSchema], default: [] },
    },
    lockOwner: { type: String },
    lockedAt: { type: Date },
    startedAt: { type: Date },
    finishedAt: { type: Date },
    attemptCount: { type: Number, default: 0 },
    lastError: { type: String },
  },
  { timestamps: true }
);

scheduledExtraReminderSchema.index({ status: 1, scheduledFor: 1 });

module.exports = mongoose.model('ScheduledExtraReminder', scheduledExtraReminderSchema);
```

### 3.9 Status enum extension

**File:** `labbe-backend-/models/AuditLogModel.js`

Extend `targetType` enum (line ~50ish): add `'scheduled_extra_reminder'`.

---

## 4. Phase 2 — Backend: Taqnyat-templates module

### 4.1 Zod schema — add `type` to assign

**File:** `labbe-backend-/src/modules/taqnyat-templates/taqnyat-templates.validation.js`

Modify `assignMappingSchema` (lines 41-48):

```js
const TEMPLATE_TYPES = ['invite', 'reminder_confirmed', 'reminder_pending', 'post_event', 'staff_access'];

const assignMappingSchema = z
  .object({
    category: z.string().nullable().optional(),
    type: z.enum(TEMPLATE_TYPES).nullable().optional(),
    varMapping: z.array(varMappingEntry).optional(),
    active: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    // staff_access is global (no category required); all others require category.
    if (data.type && data.type !== 'staff_access' && !data.category) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['category'],
        message: 'category is required for this template type',
      });
    }
  });

module.exports = { ..., assignMappingSchema, TEMPLATE_TYPES };
```

### 4.2 Service — enforce uniqueness on assign

**File:** `labbe-backend-/src/modules/taqnyat-templates/taqnyat-templates.service.js`

Modify `assignMapping` (lines 149-174):

```js
const UNIQUE_TYPES = new Set(['reminder_confirmed', 'reminder_pending', 'post_event', 'staff_access']);

async function assignMapping(id, updates, actor) {
  const doc = await TaqnyatTemplate.findById(id);
  if (!doc) throw new NotFoundError('TaqnyatTemplate');

  if (updates.varMapping !== undefined) doc.varMapping = updates.varMapping;
  if (updates.category !== undefined) doc.category = updates.category || null;
  if (updates.type !== undefined) doc.type = updates.type || null;
  if (updates.active !== undefined) doc.active = !!updates.active;
  if (typeof updates.sortOrder === 'number') doc.sortOrder = updates.sortOrder;

  // Enforce uniqueness on singleton types: if turning this one active+(category,type)
  // matches another active doc, deactivate that one in the same write.
  if (doc.active && doc.type && UNIQUE_TYPES.has(doc.type)) {
    const filter =
      doc.type === 'staff_access'
        ? { _id: { $ne: doc._id }, type: 'staff_access', active: true }
        : { _id: { $ne: doc._id }, category: doc.category, type: doc.type, active: true };
    await TaqnyatTemplate.updateMany(filter, { $set: { active: false } });
  }

  doc.updatedBy = actor?._id || null;
  await doc.save();

  await safeAudit({
    action: 'taqnyat_template.assign',
    actor,
    targetType: 'taqnyat_template',
    targetId: doc._id,
    metadata: { templateName: doc.templateName, category: doc.category, type: doc.type, varMappingCount: doc.varMapping.length },
  });

  return doc;
}
```

### 4.3 Service — filter `listForHost` by type

**File:** same.

Modify `listForHost` (lines 121-133):

```js
async function listForHost({ category, type = 'invite' } = {}) {
  const query = {
    active: true,
    status: 'APPROVED',
    removedFromMeta: { $ne: true },
    type,
  };
  if (category) query.category = category;

  return TaqnyatTemplate.find(query)
    .sort({ sortOrder: 1, createdAt: -1 })
    .select('-createdBy -updatedBy -__v')
    .lean();
}
```

Add a new helper `findActiveByCategoryAndType(category, type)` for cron use:

```js
async function findActiveByCategoryAndType(category, type) {
  const filter =
    type === 'staff_access'
      ? { type: 'staff_access', active: true, status: 'APPROVED', removedFromMeta: { $ne: true } }
      : { category, type, active: true, status: 'APPROVED', removedFromMeta: { $ne: true } };
  return TaqnyatTemplate.findOne(filter).lean();
}

module.exports = { ..., findActiveByCategoryAndType };
```

### 4.4 Controller — accept `type` query in `listForHost`

**File:** `labbe-backend-/src/modules/taqnyat-templates/taqnyat-templates.controller.js`

Modify lines 10-14:

```js
exports.listForHost = catchAsync(async (req, res) => {
  const { category, type } = req.query;
  const templates = await service.listForHost({ category, type });
  sendSuccess(res, { templates });
});
```

### 4.5 Routes — no path change, but add validator on host list

**File:** `labbe-backend-/src/modules/taqnyat-templates/taqnyat-templates.routes.js`

Add a tiny query validator (Zod):

```js
const listForHostQuerySchema = z.object({
  category: z.string().optional(),
  type: z.enum(['invite', 'reminder_confirmed', 'reminder_pending', 'post_event', 'staff_access']).optional(),
}).strict();

router.get('/', validateZod(listForHostQuerySchema, 'query'), controller.listForHost);
```

(Hosts will only call with `type=invite`; the validator just makes accepted values explicit.)

---

## 5. Phase 3 — Admin UI: Assign popup + Type dropdown

### 5.1 Update the popup component

**File:** `labbe/app/[lang]/admin-dash/taqnyat-templates/_components/AssignTaqnyatTemplatePopup.jsx`

Changes:

1. **Add `SOURCE_KEYS` entries** (lines 19-28):
   ```js
   const SOURCE_KEYS = [
     'guest.name',
     'eventDetails.title',
     'eventDetails.dateFormatted',
     'eventDetails.time',
     'eventDetails.location.address',
     'eventDetails.location.mapUrl',   // NEW
     'host.name',
     'staff.name',                      // NEW
     'staff.accessUrl',                 // NEW
     'hostNote',
     'invitationMessage',
   ];
   ```

2. **Add `SOURCE_KEY_LABEL_KEY` entries** (lines 30-39):
   ```js
   'eventDetails.location.mapUrl': 'taqnyat.sourceKeys.event_mapUrl',
   'staff.name': 'taqnyat.sourceKeys.staff_name',
   'staff.accessUrl': 'taqnyat.sourceKeys.staff_accessUrl',
   ```

3. **Add Type dropdown** (between category dropdown and varMapping section in the form, ~line 95-110):

   ```jsx
   <div className={styles.field}>
     <label>{t('taqnyat.fieldType', 'Type')}</label>
     <select {...methods.register('type')}>
       <option value="">{t('taqnyat.unassignedType', 'Unassigned')}</option>
       <option value="invite">{t('taqnyat.types.invite', 'Invitation')}</option>
       <option value="reminder_pending">{t('taqnyat.types.reminder_pending', 'Reminder — no response/maybe')}</option>
       <option value="reminder_confirmed">{t('taqnyat.types.reminder_confirmed', 'Reminder — confirmed')}</option>
       <option value="post_event">{t('taqnyat.types.post_event', 'Post-event')}</option>
       <option value="staff_access">{t('taqnyat.types.staff_access', 'Staff access')}</option>
     </select>
     {selectedType && selectedType !== 'invite' && (
       <p className={styles.hint}>
         {t('taqnyat.uniquePerCategoryHint', 'Only one active template is allowed per category for this type. Saving will deactivate the previous one.')}
       </p>
     )}
   </div>
   ```

4. **Form defaults** (line 114-122):
   ```js
   defaultValues: {
     category: template.category || '',
     type: template.type || '',
     active: template.active !== false,
     sortOrder: template.sortOrder || 0,
     varMapping: initialMapping,
   },
   ```

5. **Submit body** (line 133-144):
   ```js
   body: {
     category: data.category || null,
     type: data.type || null,
     active: data.active,
     sortOrder: data.sortOrder,
     varMapping: cleaned,
   }
   ```

### 5.2 Update Zod schema mirror on the frontend

**File:** `labbe/utils/schemas/adminPopupSchemas.js`

Add `type` to `assignTaqnyatSchema` (same enum as backend).

### 5.3 Templates table — show the new `Type` column

**File:** `labbe/app/[lang]/admin-dash/taqnyat-templates/_components/TaqnyatTemplatesTable.jsx`

Add a column between "Category" and "Variables":

```jsx
{ header: t('taqnyat.col.type', 'Type'), accessor: 'type', cell: (row) => row.type
  ? t(`taqnyat.types.${row.type}`)
  : <span className={styles.muted}>{t('taqnyat.unassignedType', '—')}</span>
}
```

---

## 6. Phase 4 — Backend: Messaging formatter + Google Maps URL

### 6.1 Add `mapUrl` + accept caller-supplied `extraContext`

**File:** `labbe-backend-/src/modules/messaging/messaging.formatting.js`

1. Extend the signature of `getEventBodyParams` to accept an optional 4th `extraContext` argument (default `{}`):

   ```js
   function getEventBodyParams(event, guestName, taqnyatTemplate = null, extraContext = {}) {
     // ...
   }
   ```

   Update existing internal callers to pass `extraContext = {}` (no behaviour change).

2. Modify the `ctx` construction (lines 74-81 area). Replace with:

   ```js
   const ed = event.eventDetails || {};
   const loc = ed.location || {};
   const mapUrl =
     loc.latitude != null && loc.longitude != null
       ? `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`
       : '';

   const ctx = {
     guest: { name: guestName || 'ضيفنا الكريم' },
     eventDetails: {
       ...ed,
       dateFormatted: formatDate(ed.date),
       location: {
         ...loc,
         mapUrl, // ← NEW resolvable key 'eventDetails.location.mapUrl'
       },
     },
     host:
       event.host && typeof event.host === 'object'
         ? { name: event.host.name || event.host.username || '' }
         : {},
     // Caller-supplied branches (staff.*, etc.) merged last so they win.
     ...extraContext,
   };
   ```

3. Apply the same `extraContext` parameter to `getPostEventBodyParams` for symmetry.

**Rationale**: passing context explicitly via an argument is safer than mutating `event.__staffContext` (no leak risk if the same event doc is reused across calls).

### 6.2 Wire `findActiveByCategoryAndType` into messaging

Where the cron / scheduled-extra-reminder service needs a template:

```js
const taqnyatTemplatesService = require('../taqnyat-templates/taqnyat-templates.service');
const template = await taqnyatTemplatesService.findActiveByCategoryAndType(
  event.eventDetails.type,
  reminderType // 'reminder_confirmed' or 'reminder_pending'
);
if (!template) {
  // audit + skip (do not crash)
  await logAudit({
    action: 'reminder.template_missing',
    targetType: 'event',
    targetId: event._id,
    metadata: { category: event.eventDetails.type, type: reminderType },
    status: 'failure',
  });
  return;
}
```

---

## 7. Phase 5 — Backend: Rewire the 24h reminder cron

### 7.1 Replace hardcoded template branching

**File:** `labbe-backend-/src/shared/utils/scheduledTasks.js`

Replace lines 624-734 (full `scheduleGuestReminders`) with a new implementation. Key changes:

1. **Drop the declined branch entirely.** No reminder is ever sent to `rsvp.response === 'declined'`.
2. **Two segments:**
   - `confirmed`: `Guest.rsvp.response === 'confirmed'` → uses template `(eventCategory, reminder_confirmed)`.
   - `pending`: `Guest.rsvp.response IN [null, 'pending', 'maybe']` OR `Guest.rsvp.responded !== true` → uses template `(eventCategory, reminder_pending)`.
3. **Stop hardcoding template names.** Look up via `taqnyatTemplatesService.findActiveByCategoryAndType(event.eventDetails.type, type)`. If missing, audit `reminder.template_missing` and skip that segment (do not crash).
4. **Use varMapping pipeline** — call into `messagingService.sendReminderForEvent({ event, guests, template })` (see 7.2).
5. **Per-guest tracking writes** on success:
   ```js
   await Guest.findByIdAndUpdate(guest._id, {
     $set: {
       'invitation.autoReminderSent': true,
       'invitation.autoReminderSentAt': new Date(),
       'invitation.autoReminderType': reminderType,
       'invitation.autoReminderMessageId': sendResult.messageId,
     },
   });
   ```
6. **Idempotency key** updated from `reminder:...` to `reminder_auto:${eventId}:${guestId}:${reminderType}:24h`. Scope: `'guest_reminder_auto'`.
7. **Keep** `messagingStatus.reminderSent = true` write to lock out re-fire in next 30-min tick.

### 7.2 New helper in messaging.reminder.service

**File:** `labbe-backend-/src/modules/messaging/messaging.reminder.service.js`

Add an exported function `sendAutoReminderBatch({ event, guests, reminderType, template, userId, scope, attemptId })` that:
- Uses `template.varMapping` via `getEventBodyParams(event, guest.name, template)`.
- Resolves header image via `getEventImageUrl(event, template)`.
- Calls `taqnyat.sendWhatsAppTemplate` (or `WithImage`) with the resolved params.
- Wraps each send in `withIdempotency(key, fn, { scope, requestHash })`.
- Returns `{ successful, failed, rateLimited, details: [...] }`.
- Does NOT touch `Guest.invitation.reminderSentAt`/`reminderCount` (those are for the manual reminder service). Auto-reminder writes go to the new `autoReminder*` fields (Phase 3.7).

### 7.3 Remove hardcoded reminder template name from config fallback

**File:** `labbe-backend-/src/config/index.js`

Remove the `halaa_event_reminder_v2` fallback at line 71. Replace with `reminderTemplateName: null` (or delete the config entirely if it's only used by the old code path). Grep usage first to confirm safe removal.

### 7.4 Audit log actions

Add to `targetType` enum if needed (Phase 3.9). New action strings emitted from this cron:
- `reminder.auto_dispatched` (per event, with metadata.confirmed_count and pending_count)
- `reminder.template_missing` (per missing (category,type) lookup)
- `reminder.auto_failed` (per event, with failure count)

---

## 8. Phase 6 — Backend: Staff WhatsApp template

### 8.1 Replace plain SMS with template send

**File:** `labbe-backend-/src/modules/events/events.staff.service.js`

Replace lines 287-319 (the inner per-staff loop). New flow:

```js
const taqnyatTemplatesService = require('../taqnyat-templates/taqnyat-templates.service');
const { getEventBodyParams, getEventImageUrl } = require('../messaging/messaging.formatting');
const taqnyat = require('../../infrastructure/taqnyat');

const template = await taqnyatTemplatesService.findActiveByCategoryAndType(null, 'staff_access');

for (const staffMember of activeStaff) {
  try {
    const tokenDoc = await StaffAccessToken.createForStaff(eventId, staffMember.phone, staffMember.name);
    const staffUrl = `${frontendUrl}/ar/staff?token=${tokenDoc.token}`;

    // Plain SMS body kept as fallback when WhatsApp template fails or staff has no WA.
    const smsFallback =
      `مرحبا ${staffMember.name}!\n\n` +
      `تم تعيينك كمشرف في فعالية "${eventTitle}"\n` +
      (eventDate ? `📅 التاريخ: ${eventDate}\n` : '') +
      (eventLocation ? `📍 المكان: ${eventLocation}\n` : '') +
      `\nللدخول لصفحة المشرفين:\n${staffUrl}`;

    if (template) {
      // Pass staff context explicitly so the formatter can resolve staff.* keys.
      const staffCtx = { staff: { name: staffMember.name, accessUrl: staffUrl } };
      const bodyParams = getEventBodyParams(event, staffMember.name, template, staffCtx);
      const imageUrl = getEventImageUrl(event, template);
      const wa = imageUrl
        ? await taqnyat.sendWhatsAppTemplateWithImage(staffMember.phone, template.templateName, template.language, imageUrl, bodyParams, smsFallback)
        : await taqnyat.sendWhatsAppTemplate(staffMember.phone, template.templateName, template.language, bodyParams, smsFallback);
      if (!wa.success) throw new Error(wa.error || 'wa_failed');
    } else {
      // No staff_access template assigned yet — degrade to SMS.
      await taqnyat.sendSMS(staffMember.phone, smsFallback);
    }
    sent++;
    results.push({ name: staffMember.name, phone: staffMember.phone, status: 'sent' });
  } catch (error) {
    failed++;
    event.messagingStatus = event.messagingStatus || {};
    event.messagingStatus.staffFailedCount = (event.messagingStatus.staffFailedCount || 0) + 1;
    await event.save().catch(() => {});
    results.push({ name: staffMember.name, phone: staffMember.phone, status: 'failed', error: error.message });
  }
}
```

(`staffCtx` is a local per-iteration object — no shared state, no cleanup needed.)

---

## 9. Phase 7 — Backend: ScheduledExtraReminder module

### 9.1 Module structure

**New directory:** `labbe-backend-/src/modules/scheduled-extra-reminders/`

Files:
- `scheduled-extra-reminders.routes.js`
- `scheduled-extra-reminders.controller.js`
- `scheduled-extra-reminders.service.js`
- `scheduled-extra-reminders.validation.js` (Zod)

### 9.2 Endpoints

| Method | Path | Auth/RBAC | Body / Params | Returns |
|---|---|---|---|---|
| `POST` | `/events/:id/scheduled-reminders` | requires user can access event (host, whitelabel-scoped admin, platform admin) | `{ reminderType: 'reminder_confirmed'\|'reminder_pending', guestIds: ObjectId[], scheduledFor: ISO date }` | `{ scheduled: doc }` |
| `GET` | `/events/:id/scheduled-reminders` | same | — | `{ scheduledReminders: doc[] }` |
| `DELETE` | `/events/:id/scheduled-reminders/:rid` | same | — | `{ cancelled: true, refundedQuota: N }` |

The "user can access event" check reuses `events.crud.service._buildScopedEventQuery(eventId, userContext)` — if it returns no doc, 404.

### 9.3 Validation (Zod)

```js
const { z } = require('zod');
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');

const createSchema = z.object({
  reminderType: z.enum(['reminder_confirmed', 'reminder_pending']),
  guestIds: z.array(objectId).min(1).max(2000),
  scheduledFor: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'scheduledFor must be ISO datetime'),
}).strict();

module.exports = { createSchema };
```

### 9.4 Service — `create()` flow

```js
const eventsService = require('../events/events.crud.service');

async function create({ eventId, body, user }) {
  // 1. Resolve event with ownership scope (throws ForbiddenError / NotFound if not allowed).
  //    Reuses the existing scoped-query helper inside getEventById, which handles
  //    super_admin, tenant-scoped admins/whitelabel users, and hosts.
  const event = await eventsService.getEventById(eventId, user);
  if (!event) throw new NotFoundError('Event');

  // 2. Resolve subscription (event.subscriptionId)
  if (!event.subscriptionId) throw new AppError('Event has no subscription', 400);

  // 3. Validate window:
  //    - scheduledFor > now + 5min
  //    - scheduledFor < eventDate - 24h
  //    - scheduledFor > (event.launchSettings.scheduledDate || event.launchedAt || event.createdAt)
  const now = Date.now();
  const target = new Date(body.scheduledFor).getTime();
  const eventTs = new Date(event.eventDetails.date).getTime();
  const inviteSentTs = (event.launchSettings?.scheduledDate || event.launchedAt || event.createdAt).getTime();
  if (target < now + 5 * 60_000) throw new AppError('Reminder must be at least 5 minutes in the future', 400);
  if (target > eventTs - 24 * 60 * 60_000) throw new AppError('Reminder must be at least 24 hours before the event', 400);
  if (target < inviteSentTs) throw new AppError('Reminder must be after the initial invite', 400);

  // 4. Validate guestIds belong to event
  const validCount = await Guest.countDocuments({ _id: { $in: body.guestIds }, event: eventId });
  if (validCount !== body.guestIds.length) throw new AppError('Some guests do not belong to this event', 400);

  // 5. Reserve quota atomically
  await Subscription.reserveReminders(event.subscriptionId, body.guestIds.length); // throws INSUFFICIENT_REMINDER_QUOTA

  // 6. Create doc
  let doc;
  try {
    doc = await ScheduledExtraReminder.create({
      event: eventId,
      subscriptionId: event.subscriptionId,
      eventOwner: event.host,
      createdBy: { user: user._id, role: user.role, onBehalfOfOwner: String(user._id) !== String(event.host) },
      reminderType: body.reminderType,
      guestIds: body.guestIds,
      scheduledFor: new Date(body.scheduledFor),
      status: 'pending',
      consumedQuota: body.guestIds.length,
    });
  } catch (err) {
    await Subscription.releaseReservedReminders(event.subscriptionId, body.guestIds.length);
    throw err;
  }

  // 7. Mark guests as scheduled (for table display)
  await Guest.updateMany(
    { _id: { $in: body.guestIds } },
    {
      $set: {
        'invitation.extraReminderScheduled': true,
        'invitation.extraReminderScheduledFor': doc.scheduledFor,
        'invitation.extraReminderType': body.reminderType,
        'invitation.extraReminderDocId': doc._id,
      },
    }
  );

  // 8. Audit
  await logAudit({
    action: 'scheduled_extra_reminder.created',
    actor: user,
    targetType: 'scheduled_extra_reminder',
    targetId: doc._id,
    whitelabelId: event.whitelabelId,
    metadata: {
      eventId,
      reminderType: body.reminderType,
      guestCount: body.guestIds.length,
      scheduledFor: doc.scheduledFor,
      onBehalfOfOwner: doc.createdBy.onBehalfOfOwner,
      ownerHostId: String(event.host),
    },
  });

  return doc;
}
```

### 9.5 Service — `cancel()` flow

```js
async function cancel({ eventId, reminderId, user }) {
  const event = await eventsService.getEventById(eventId, user);
  if (!event) throw new NotFoundError('Event');
  const doc = await ScheduledExtraReminder.findOne({ _id: reminderId, event: eventId });
  if (!doc) throw new NotFoundError('ScheduledExtraReminder');
  if (doc.status !== 'pending') throw new AppError(`Cannot cancel a ${doc.status} reminder`, 400);

  // Atomic flip
  const flipped = await ScheduledExtraReminder.findOneAndUpdate(
    { _id: doc._id, status: 'pending' },
    { $set: { status: 'cancelled', finishedAt: new Date() } },
    { new: true }
  );
  if (!flipped) throw new AppError('Reminder already processed', 409);

  // Refund quota + unmark guests
  await Subscription.releaseReservedReminders(event.subscriptionId, doc.consumedQuota);
  await Guest.updateMany(
    { _id: { $in: doc.guestIds }, 'invitation.extraReminderDocId': doc._id },
    {
      $set: {
        'invitation.extraReminderScheduled': false,
      },
      $unset: {
        'invitation.extraReminderScheduledFor': '',
        'invitation.extraReminderType': '',
        'invitation.extraReminderDocId': '',
      },
    }
  );

  await logAudit({
    action: 'scheduled_extra_reminder.cancelled',
    actor: user,
    targetType: 'scheduled_extra_reminder',
    targetId: doc._id,
    whitelabelId: event.whitelabelId,
    metadata: { refundedQuota: doc.consumedQuota, eventId },
  });

  return { cancelled: true, refundedQuota: doc.consumedQuota };
}
```

### 9.6 Cron — extra-reminder dispatcher

**File:** `labbe-backend-/src/shared/utils/scheduledTasks.js`

Add a new cron at the bottom alongside others:

```js
const scheduleExtraReminderDispatcher = () => {
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    const due = await ScheduledExtraReminder.find({
      status: 'pending',
      scheduledFor: { $lte: now },
    }).limit(50);

    for (const doc of due) {
      await _runScheduledExtraReminder(doc);
    }
  });
};
```

Where `_runScheduledExtraReminder(doc)`:

1. **Atomic claim** — flip `pending → running` (race-safe; another worker that won the race returns null and exits):
   ```js
   const claimed = await ScheduledExtraReminder.findOneAndUpdate(
     { _id: doc._id, status: 'pending' },
     {
       $set: {
         status: 'running',
         lockOwner: workerId,
         lockedAt: new Date(),
         startedAt: new Date(),
       },
       $inc: { attemptCount: 1 },
     },
     { new: true }
   );
   if (!claimed) return; // another worker took it, or it was cancelled in the window
   doc = claimed;
   ```
2. Fetch event (populate `host`).
3. Look up template by `(event.eventDetails.type, doc.reminderType)`.
4. If template missing: set `status='failed'`, `lastError='template_missing'`; release reservation (refund); audit `scheduled_extra_reminder.failed_template_missing`; return.
5. Fetch guests by `{ _id: { $in: doc.guestIds } }`.
6. `runBatched(guests, sendOne, { concurrency: 5, ratePerSecond: 10 })`.
7. For each guest: `withIdempotency('extra_reminder:${doc._id}:${guest._id}', send, { scope: 'extra_reminder', requestHash })`.
8. On success per guest: write `Guest.invitation.extraReminderSent=true, extraReminderSentAt, extraReminderMessageId`.
9. Aggregate: `successful, failed, rateLimited`.
10. Final write:
    - `status = successful === guests.length ? 'sent' : (successful === 0 ? 'failed' : 'partial')`
    - `result.successful/failed/rateLimited/details`
    - `finishedAt = new Date()`
11. **Quota consumption** (precise):
    - For each successful send: `Subscription.consumeReservedReminders(subId, 1)` atomically (moves 1 from reserved → consumed).
    - For each failed send: `Subscription.releaseReservedReminders(subId, 1)` (refunds).
    - Edge case: also refund `rateLimited` since those didn't actually send (let the user re-schedule).
12. Audit `scheduled_extra_reminder.dispatched` with metadata.

Retry / backoff: bounded `attemptCount ≤ 3` with 5/30/120-min backoffs (mirroring launch). After exhaustion: status `failed`, refund all unconsumed quota.

> **Note on Taqnyat 429 refund**: refunding `rateLimited` sends is consistent with how `messaging.send.service.js` already handles 429 (treated as "did not send", no `failedAttempts` increment). Confirmed safe — a 429 response means the message was not queued at Taqnyat. Cross-checked with the existing rate-limit path in `messaging.send.service.js` and `taqnyat.js` (`TAQNYAT_ERRORS[429]`).

### 9.7 Init the cron

In `initScheduledTasks()` add `scheduleExtraReminderDispatcher()`.

### 9.8 Expose quota in `GET /events/:id` payload (critical for admin-on-host visibility)

**File:** `labbe-backend-/src/modules/events/events.crud.service.js`

In `getEventById`, after resolving the event, attach a lightweight `subscription` projection so that any viewer (host, platform admin, whitelabel admin) sees the **event-owner's** reminder quota — not their own.

Append to the response:

```js
if (event.subscriptionId) {
  const sub = await Subscription.findById(event.subscriptionId)
    .select('remindersPool remindersConsumed remindersReserved invitePool compensationPool invitesConsumed status expiresAt')
    .lean();
  if (sub) {
    const remindersRemaining =
      (sub.remindersPool || 0) - (sub.remindersConsumed || 0) - (sub.remindersReserved || 0);
    const invitesRemaining =
      sub.invitePool === null
        ? null
        : (sub.invitePool || 0) + (sub.compensationPool || 0) - (sub.invitesConsumed || 0);
    event.subscription = {
      _id: sub._id,
      status: sub.status,
      expiresAt: sub.expiresAt,
      remindersPool: sub.remindersPool || 0,
      remindersConsumed: sub.remindersConsumed || 0,
      remindersReserved: sub.remindersReserved || 0,
      remindersRemaining,
      invitesRemaining,
    };
  }
}
```

This is **the single source of truth** that the UI uses to gate the Schedule Reminder button. Web/mobile components read `event.subscription.remindersRemaining` directly, never `useMySubscription()`.

---

## 10. Phase 8 — Web: Shared single-event-page components

### 10.1 Create shared component location

**New directory:** `labbe/components/event-detail/`

Move/copy these components into this folder (verbatim, with role-aware props):

- `EventDetailHeader.jsx` — title + status + action buttons (was `EventHeader.jsx`)
- `EventStats.jsx` — already shared by both pages (move there or alias)
- `FailureBanner.jsx` (was `EventFailureBanner.jsx`)
- `PartialFailureBanner.jsx`
- `StaffTokensList.jsx`
- `GuestTable/` (with `index.jsx`, `GuestRows.jsx`, `GuestPopups.jsx`, `guestCellRenderers.jsx`, `useGuestTableActions.js`)
- `AutoReminderInfoText.jsx` (NEW — small banner showing "we send auto-reminder 24h before")
- `ScheduleReminderSection.jsx` (NEW — see 10.3)

Each component takes a `role` prop (or reads it from a context provider). Differences:
- Admin headers may show a "viewing as admin" badge and a host-selector affordance (not relevant on this page actually).
- Permission-gated affordances use `canEdit`/`canDelete` from `navConfig.js` helpers.

### 10.2 Refactor host page to use shared components

**File:** `labbe/app/[lang]/host/events/[id]/page.jsx`

Replace imports with shared component imports. Final shape:

```jsx
import { cookies } from 'next/headers';
import styles from './singleEvent.module.css';
import {
  EventDetailHeader,
  EventStats,
  FailureBannerClient,
  GuestTable,
  AutoReminderInfoText,
  ScheduleReminderSection,
} from '@/components/event-detail';

export default async function SingleEventPage({ params }) {
  const { id, lang } = await params;
  // ... existing prefetch unchanged ...
  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <div className={styles.page}>
        <EventDetailHeader eventId={id} role="host" />
        <FailureBannerClient eventId={id} />
        <AutoReminderInfoText />
        <ScheduleReminderSection eventId={id} role="host" />
        <EventStats eventId={id} />
        <GuestTable eventId={id} role="host" />
      </div>
    </QueryClientServerProvider>
  );
}
```

### 10.3 Refactor admin page

**File:** `labbe/app/[lang]/admin-dash/events/[id]/page.jsx`

Replace `EventDetailsContent` with the same shared component composition, keeping the `requirePageAccess('events', lang)` guard at the top:

```jsx
export default async function AdminEventDetailsPage({ params }) {
  const { lang, id } = await params;
  await requirePageAccess('events', lang);
  // ... existing prefetch unchanged ...
  return (
    <ClientComponentsTranslationsProvider locale={lang} namespaces={i18nNamespaces} resources={resources}>
      <QueryClientServerProvider queryClient={queryClient}>
        <div className={styles.page}>
          <EventDetailHeader eventId={id} role="admin" />
          <FailureBannerClient eventId={id} />
          <AutoReminderInfoText />
          <ScheduleReminderSection eventId={id} role="admin" />
          <EventStats eventId={id} />
          <GuestTable eventId={id} role="admin" />
        </div>
      </QueryClientServerProvider>
    </ClientComponentsTranslationsProvider>
  );
}
```

Once both pages compile and the shared components are in use, **delete** the old per-page duplicates:
- `labbe/app/[lang]/host/events/[id]/_components/EventHeader.jsx`
- `labbe/app/[lang]/host/events/[id]/_components/EventStats.jsx`
- ... and all duplicated `_components/` files under both pages, except CSS modules.
- `labbe/app/[lang]/admin-dash/events/[id]/_components/EventDetailsContent.jsx`
- `labbe/app/[lang]/admin-dash/events/[id]/_components/AdminEventHeader/`
- `labbe/app/[lang]/admin-dash/events/[id]/_components/AdminGuestTable/`

(Audit each file before deletion to ensure no other consumer.)

### 10.4 `ScheduleReminderSection.jsx` — new component

**Behaviour:**

1. Reads `event` from `useEvent(eventId)` — **never** `useMySubscription()`. Reminder quota comes from `event.subscription.remindersRemaining` (populated by backend in Phase 9.8) so platform admins viewing a host's event see the host's quota, not their own.
2. Computes the visibility gate:
   ```js
   const now = Date.now();
   const eventTs = new Date(event?.eventDetails?.date).getTime();
   const hasValidWindow =
     Number.isFinite(eventTs) && (eventTs - 24 * 3600_000) > (now + 5 * 60_000);
   const remaining = event?.subscription?.remindersRemaining ?? 0;
   const hasPendingScheduled = scheduledReminders?.some((r) => r.status === 'pending');
   const canSee =
     !!event?.subscriptionId &&
     hasValidWindow &&
     (remaining > 0 || hasPendingScheduled);
   ```
   If `canSee` is false, **renders nothing**.
3. Renders:
   - "Schedule Reminder" button
   - List of already-scheduled-but-not-sent reminders (with cancel buttons)
4. On button click, opens `ScheduleReminderModal`:
   - Radio: reminder type (`reminder_confirmed` or `reminder_pending`)
   - Guest multiselect (filtered to guests matching the type)
     - For `reminder_confirmed`: only `guest.status === 'confirmed'`
     - For `reminder_pending`: guests where `rsvp.responded !== true OR rsvp.response === 'maybe'`
   - DateTime picker with bounds `[now+5min, eventDate−24h]`
   - Quota counter: "{{used}} of {{remaining}} reminders"
   - Submit → POST `/events/:id/scheduled-reminders` → refetch list + invalidate guest table
   - Cancel button

**Visibility rule** (locked decision #6): the back-end already enforces "you must have access to this event"; the front-end additionally hides the button when `subscription.remindersRemaining === 0` AND no pre-existing pending reminders exist. Platform admins viewing a host's event see the button iff that host's subscription has remaining quota.

### 10.5 GuestTable — add the two new columns

**Files:**
- `labbe/components/event-detail/GuestTable/GuestRows.jsx`
- `labbe/components/event-detail/GuestTable/guestCellRenderers.jsx`

Add two cell renderers:

```jsx
function AutoReminderCell({ guest, t }) {
  if (guest.invitation?.autoReminderSent) {
    return <Badge variant="success" title={formatDate(guest.invitation.autoReminderSentAt)}>{t('table.cell.sent', 'Sent')}</Badge>;
  }
  return <span className={styles.muted}>—</span>;
}

function ExtraReminderCell({ guest, t }) {
  const inv = guest.invitation || {};
  if (inv.extraReminderSent) {
    return <Badge variant="success" title={formatDate(inv.extraReminderSentAt)}>{t('table.cell.sent', 'Sent')}</Badge>;
  }
  if (inv.extraReminderScheduled) {
    return <Badge variant="info" title={formatDate(inv.extraReminderScheduledFor)}>{t('table.cell.scheduled', 'Scheduled')}</Badge>;
  }
  return <span className={styles.muted}>—</span>;
}
```

Add two columns to the column config in `GuestRows.jsx`:

```jsx
{ header: t('table.columns.autoReminder', 'Auto reminder'), cell: AutoReminderCell, key: 'autoReminder' },
{ header: t('table.columns.extraReminder', 'Extra reminder'), cell: ExtraReminderCell, key: 'extraReminder' },
```

### 10.6 React Query — new hooks

**File:** `labbe/hooks/queries/useScheduledExtraReminders.js` (NEW)

```js
export function useScheduledExtraReminders(eventId) {
  return useQuery({
    queryKey: ['scheduled-extra-reminders', eventId],
    queryFn: () => scheduledExtraRemindersService.list(eventId),
    enabled: !!eventId,
  });
}

export function useCreateScheduledExtraReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, body }) => scheduledExtraRemindersService.create(eventId, body),
    onSuccess: (_, { eventId }) => {
      qc.invalidateQueries({ queryKey: ['scheduled-extra-reminders', eventId] });
      qc.invalidateQueries({ queryKey: ['events', eventId] });
      qc.invalidateQueries({ queryKey: ['events', eventId, 'stats'] });
      qc.invalidateQueries({ queryKey: ['guests', eventId] });
    },
  });
}

export function useCancelScheduledExtraReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, reminderId }) => scheduledExtraRemindersService.cancel(eventId, reminderId),
    onSuccess: (_, { eventId }) => {
      qc.invalidateQueries({ queryKey: ['scheduled-extra-reminders', eventId] });
      qc.invalidateQueries({ queryKey: ['guests', eventId] });
    },
  });
}
```

**File:** `labbe/services/scheduledExtraRemindersService.js` (NEW)

```js
export const scheduledExtraRemindersService = {
  list: (eventId) => apiRequest({ method: 'GET', path: `/events/${eventId}/scheduled-reminders` }),
  create: (eventId, body) => apiRequest({ method: 'POST', path: `/events/${eventId}/scheduled-reminders`, data: body }),
  cancel: (eventId, rid) => apiRequest({ method: 'DELETE', path: `/events/${eventId}/scheduled-reminders/${rid}` }),
};
```

Register paths in `labbe/services/new-backend/api.config.js`.

---

## 11. Phase 9 — Web: Create-event step 4 filter by type

### 11.1 Web host step 4

**File:** `labbe/app/[lang]/host/create-event/_components/stepFour/StepFour.js`

Line 77-80:

```js
const { data, isLoading, error } = useHostTaqnyatTemplates(
  { category: category || undefined, type: 'invite' },
  { enabled: true }
);
```

### 11.2 Hook signature

**File:** `labbe/hooks/queries/useTaqnyatTemplates.js`

```js
export function useHostTaqnyatTemplates({ category, type } = {}, opts = {}) {
  return useQuery({
    queryKey: TAQNYAT_TEMPLATES_QK.hostList({ category, type }),
    queryFn: () => taqnyatTemplatesService.getTemplates({ category, type }),
    staleTime: 5 * 60 * 1000,
    ...opts,
  });
}
```

### 11.3 Service

**File:** `labbe/services/taqnyatTemplatesService.js`

```js
getTemplates: ({ category, type } = {}) =>
  apiRequest({
    method: 'GET',
    path: `${API_PATHS.taqnyatTemplates.list}${buildQuery({ category, type })}`,
  }),
```

### 11.4 Mobile

**File:** `halla-mobile/components/createEvent/StepFour.js`

Same change: pass `type: 'invite'` to `useHostTaqnyatTemplates({ category, type: 'invite' })`.

**File:** `halla-mobile/services/taqnyatTemplatesService.js`

Add `type` to `buildQuery`.

---

## 12. Phase 10 — Mobile: Unify host event detail with admin

### 12.1 New host route

**File:** `halla-mobile/navigation/AppNavigator.js`

In `HostStack` (line 285-305), add a stack screen mirroring admin's:

```jsx
<HostStack.Screen
  name="EventDetails"
  component={EventDetailsScreen}
  options={{ headerShown: false }}
/>
```

Import `EventDetailsScreen` from `screens/admin/admin-dashboard/EventDetailsScreen.js` OR move that file to `screens/shared/EventDetailsScreen.js` and import from there in both navigators. Recommended: move to `screens/shared/`.

### 12.2 Update host EventsScreen — drop inline detail view

**File:** `halla-mobile/screens/host/EventsScreen.js`

- Remove `currentView` state machine (`details`/`stats` modes, lines 20-21).
- Remove `EventDetails` and `SingleEventStats` rendering branches (lines 114-143 area).
- Convert event-click handler to `navigation.navigate('EventDetails', { eventId: event.id })` (this matches admin convention).
- Keep `MainTabs > Events` showing only the list.

### 12.3 Delete legacy code

After confirming no other consumer:

- `halla-mobile/components/events/EventDetails.js`
- `halla-mobile/components/events/SingleEventStats/` (whole folder)
- Any other host-only event-detail components that the new shared screen does not need.

### 12.4 Add ScheduleReminderSection to mobile

**New file:** `halla-mobile/components/admin-dashboard/events/ScheduleReminderSection.js`

Same logic as web: visibility gated by `subscription.remindersRemaining > 0 || hasPendingScheduled`. Opens a modal with type radio, multi-select guest list, datetime picker, submit.

Wire into `EventDetailsScreen.js` (after the existing `EventActionsHeader`).

### 12.5 Add AutoReminderInfoText to mobile

**New file:** `halla-mobile/components/admin-dashboard/events/AutoReminderInfoText.js`

Simple banner. Wire into `EventDetailsScreen.js` just before `ScheduleReminderSection`.

### 12.6 Update GuestList rows — add two columns

**File:** `halla-mobile/components/admin-dashboard/events/GuestList.js` (and `AdminListItem.js`)

Add the two badge cells (Auto reminder, Extra reminder) using same logic as web (Phase 8.5).

### 12.7 Mobile hooks/services

**New files:**
- `halla-mobile/hooks/queries/useScheduledExtraReminders.js`
- `halla-mobile/services/scheduledExtraRemindersService.js`

Mirror web Phase 8.6.

---

## 13. Phase 11 — Mobile: Unify create-event

### 13.1 Promote `CreateEventForm` to a shared component

**File:** `halla-mobile/components/admin-dashboard/events/CreateEventForm.js`

Currently used only by admin. Goal: make it usable by host too (and remove the host-only `screens/host/CreateEventScreen.js` body).

Add a prop `mode: 'host' | 'admin'`. When `mode === 'host'`:
- Skip the `HostSelectorStep` (renders nothing).
- Subscription = `useMySubscription()` instead of host-selector-driven.
- Submission calls host's `useCreateEvent()` (not `useCreateEventForHost()`).

When `mode === 'admin'`: existing behavior.

### 13.2 Update host's `CreateEventScreen.js`

Replace the 5-step custom wizard with a thin wrapper:

```js
import CreateEventForm from '../../components/admin-dashboard/events/CreateEventForm';
export default function CreateEventScreen() {
  return <CreateEventForm mode="host" />;
}
```

Delete old wizard code in this screen.

### 13.3 (Removed) Tab-key normalization

Skipped. Web's `REPLY_TABS` uses `attending`/`maybe`/`absence` as UI tab keys but writes to canonical `onAttend`/`onExpected`/`onAbsent` via the `.canonical` mapping. The persisted shape is already consistent across web and mobile — only the in-component UI key differs, which is cosmetic. Renaming would be pure churn with zero behavioral benefit. Out of scope.

---

## 14. Phase 12 — Localization

### 14.1 New keys (EN + AR, web + mobile)

Add under existing `admin.taqnyat` namespace (`labbe/localization/locales/{en,ar}/admin.json`):

```json
"taqnyat": {
  ...existing...
  "col": { ...existing..., "type": "Type" },
  "fieldType": "Template type",
  "unassignedType": "Unassigned",
  "uniquePerCategoryHint": "Only one active template is allowed per category for this type. Saving deactivates the previous one.",
  "types": {
    "invite": "Invitation",
    "reminder_pending": "Reminder — no response or maybe",
    "reminder_confirmed": "Reminder — confirmed",
    "post_event": "Post-event",
    "staff_access": "Staff access"
  },
  "sourceKeys": {
    ...existing...
    "event_mapUrl": "Event location (Google Maps URL)",
    "staff_name": "Staff name",
    "staff_accessUrl": "Staff access URL"
  }
}
```

Arabic equivalents (translated):
- `"types": { "invite": "دعوة", "reminder_pending": "تذكير — لم يردّ أو ربما", "reminder_confirmed": "تذكير — مؤكد الحضور", "post_event": "بعد الحدث", "staff_access": "وصول المشرفين" }`
- `"event_mapUrl": "موقع الحدث (Google Maps)"`
- `"staff_name": "اسم المشرف"`
- `"staff_accessUrl": "رابط دخول المشرف"`
- `"fieldType": "نوع القالب"`
- `"unassignedType": "غير معيّن"`
- `"uniquePerCategoryHint": "يُسمح بقالب واحد نشط فقط لكل فئة لهذا النوع. الحفظ سيُلغي تفعيل السابق."`

Under `home-events` namespace (`labbe/localization/locales/{en,ar}/home-events.json`):

```json
"singleEvent": {
  ...existing...
  "autoReminderInfo": "We automatically send a reminder to your guests 24 hours before the event.",
  "scheduleReminder": {
    "button": "Schedule extra reminder",
    "modalTitle": "Schedule extra reminder",
    "typeLabel": "Reminder type",
    "typeConfirmed": "For guests who confirmed",
    "typePending": "For guests who did not respond or chose maybe",
    "guestsLabel": "Select guests",
    "selectedCount": "{{count}} selected",
    "dateLabel": "Send at",
    "dateMin": "Earliest: in 5 minutes",
    "dateMax": "Latest: 24 hours before the event",
    "quotaLabel": "Quota",
    "quotaValue": "{{used}} of {{remaining}} available",
    "submit": "Schedule",
    "cancel": "Cancel",
    "cancelAction": "Cancel reminder",
    "cancelConfirm": "Cancel this scheduled reminder? Quota will be refunded.",
    "scheduledList": "Scheduled reminders",
    "noScheduled": "No scheduled extra reminders",
    "scheduledFor": "Scheduled for {{when}}",
    "errors": {
      "dateOutOfRange": "Date must be between 5 minutes from now and 24 hours before the event",
      "noGuests": "Select at least one guest",
      "insufficientQuota": "You don't have enough reminder quota",
      "noTemplate": "No reminder template is configured for this category. Contact support."
    }
  }
},
"table": {
  "columns": {
    ...existing...
    "autoReminder": "Auto reminder",
    "extraReminder": "Extra reminder"
  },
  "cell": {
    "sent": "Sent",
    "scheduled": "Scheduled"
  }
}
```

Arabic equivalents:
- `"autoReminderInfo": "نُرسل تذكيراً تلقائياً للضيوف قبل المناسبة بـ 24 ساعة."`
- `"scheduleReminder.button": "جدولة تذكير إضافي"` … etc. (full AR set written out in the actual file)

### 14.2 Remove obsolete keys

After Phase 7 cron rewire, any localization referencing the dropped `declined` reminder branch should be removed. Grep for `"declined": ` under `home-events` and `events` namespaces; remove or repurpose as needed.

### 14.3 Mobile localization mirror

Mirror the same keys in `halla-mobile/localization/locales/{en,ar}/admin.json` and `halla-mobile/localization/locales/{en,ar}/events.json`.

Some keys also need to exist under `home-events` mobile namespace — if mobile uses `events.json` instead of `home-events.json`, place them there.

---

## 15. Phase 13 — Test & verification plan

### 15.1 Automated checks

Run after each phase:

```
cd labbe-backend- && npm run lint && npm test
cd labbe && npm run lint && npm run typecheck && npm run build
cd halla-mobile && npm run lint
```

### 15.2 Manual smoke (end-to-end)

1. **Setup**: super-admin assigns:
   - 1 invite template to `wedding` (`halaa_wedding_invite_gold`)
   - 1 reminder_confirmed (`halaa_attendance_confirmation_reminder`)
   - 1 reminder_pending (`halaa_pending_rsvp_reminder`)
   - 1 staff_access (any global template)
2. **Create event** as host → step 4 only shows invite templates → host picks one.
3. **Launch event** → invites go out. WhatsApp message contains a clickable Google Maps URL (if the placeholder was mapped to `eventDetails.location.mapUrl`).
4. **Have guests respond**: confirm 2, decline 1, maybe 1, leave 1 no-response.
5. **Wait for cron 24h before** (or temporarily seed `eventDate` to be 24h away):
   - Verify confirmed guests received `reminder_confirmed` template (`halaa_attendance_confirmation_reminder`).
   - Verify maybe + no-response guests received `reminder_pending`.
   - Verify declined guest received **nothing**.
   - Verify `Guest.invitation.autoReminderSent` flipped to true with `autoReminderSentAt`.
   - Verify guest table shows "Sent" badges for those guests.
6. **Buy 5 extra reminders** as the host.
7. **On single event page**: button "Schedule extra reminder" is visible. Click → modal opens.
8. Select reminder type = confirmed, pick 2 guests, set datetime to 10 minutes from now, submit.
9. Verify quota counter shows `2 of 3 remaining`.
10. Verify `Guest.invitation.extraReminderScheduled = true` and the table shows "Scheduled".
11. Wait for the dispatcher → verify the template arrived, `extraReminderSent = true`, `Subscription.remindersConsumed += 2`.
12. **Cancel test**: schedule another reminder, cancel it before fire → verify quota refunded and guests unmarked.
13. **Admin smoke**: as super_admin viewing the same event → see the same button/state, schedule on host's behalf → audit shows `onBehalfOfOwner: true` with `ownerHostId`.
14. **Staff WhatsApp**: trigger "Notify staff" → staff receives a Taqnyat template message (not raw SMS) when `staff_access` template is configured.
15. **Mobile smoke**: same flow on mobile host and admin paths — confirm host now uses the stack route (no inline modal).

### 15.3 Edge-case checks

| Case | Expected |
|---|---|
| Template missing for `(wedding, reminder_pending)` | Auto-cron logs `reminder.template_missing` and skips that segment; scheduled-extra-reminder dispatcher marks doc as `failed` + refunds. |
| Quota = 0 | Button hidden on host AND admin views; backend rejects POST with `INSUFFICIENT_REMINDER_QUOTA`. |
| Schedule for time after `eventDate - 24h` | Backend rejects with 400; UI prevents submission. |
| Schedule for time before now + 5 min | Backend rejects with 400. |
| Two admins concurrently cancel the same pending reminder | Second one gets 409 `Reminder already processed`. No double refund. |
| Race: cron is dispatching at moment user cancels | `cancel()` filter `{ status: 'pending' }` fails → 409. Cron continues as the legitimate owner. |
| Guest deleted between schedule and dispatch | Send fails for that guest, marked in `result.details`. Refund applies. |
| Whitelabel host's event viewed by a different whitelabel's admin | `eventsService.getEventById` (using `_buildScopedEventQuery`) returns null → 404, already enforced. |

---

## 16. Phase 14 — Rollout sequence

Implement in this order to avoid breakage:

1. **Phase 1** (data model + migrations) — but keep both old and new fields temporarily. Run backfill.
2. **Phase 2** (taqnyat-templates module — add `type`).
3. **Phase 3** (admin assign popup — add type dropdown). At this point, super-admin can re-tag templates.
4. **Phase 4** (formatter — add `mapUrl` + staff context). No behavior change yet.
5. **Phase 5** (rewire 24h cron). Removes hardcoded names. **Critical**: requires Phase 3 done so admins have already tagged the wedding category reminder templates, else cron silently skips. Inform ops to assign before deploying this phase.
6. **Phase 6** (staff WhatsApp). Same caveat — requires `staff_access` template assigned, else degrades to SMS.
7. **Phase 9** (create-event step 4 filter). After Phase 2 so the API supports `type` filter.
8. **Phase 7** (scheduled-extra-reminders backend).
9. **Phase 8** (web shared event-detail page + ScheduleReminderSection + table columns).
10. **Phase 10** (mobile unification + ScheduleReminderSection).
11. **Phase 11** (mobile create-event unification + tab key normalization).
12. **Phase 12** (localization).
13. **Phase 13** (verification).

**Ops checklist before deploying Phase 5/6** (sent to operations team):

- [ ] Assign `reminder_confirmed` + `reminder_pending` templates for **every** active event category (`wedding`, `birthday`, `graduation`, `engagement`, `meeting`, `conference`, `other`). The cron looks up `(eventDetails.type, reminder_*)` — if any category lacks templates, that category's events silently get no auto reminders (audit row written, no crash). This couples the EventModel `eventDetails.type` enum to TemplateCategory codes — they must stay in sync.
- [ ] Assign global `staff_access` template.
- [ ] Verify `varMapping` source keys point to correct fields, including `eventDetails.location.mapUrl` if Google Maps URL is desired in body.
- [ ] Verify that any new category code added in the future is mirrored in the EventModel `eventDetails.type` enum.

**Pricing-migration note**: existing `Addon` documents already on the old `EXTRA_REMINDERS_TIERS` (small tier quantities 1-5) keep their stored `quantity` and `price` and will apply correctly through the new Phase 3.5 quota branch (which reads `addon.quantity` directly — historical price is irrelevant to quota application). Only the catalog and new purchases use the rewritten tiers.

---

## 17. File-by-file change index (for reviewers)

| # | File | Action |
|---|---|---|
| 1 | `labbe-backend-/models/TaqnyatTemplateModel.js` | Add `type` field + new indexes |
| 2 | `labbe-backend-/models/SubscriptionModel.js` | Add `remindersPool`/`remindersConsumed`/`remindersReserved` + virtual + static methods |
| 3 | `labbe-backend-/models/EventModel.js` | (Optional) Add `messagingStatus.reminderSentAt` |
| 4 | `labbe-backend-/models/GuestModel.js` | Extend `invitationSchema` with auto + extra reminder fields |
| 5 | `labbe-backend-/models/ScheduledExtraReminderModel.js` | NEW |
| 6 | `labbe-backend-/models/AuditLogModel.js` | Extend `targetType` enum with `scheduled_extra_reminder` |
| 7 | `labbe-backend-/migrations/2026-05-21_template_types.js` | NEW |
| 8 | `labbe-backend-/src/shared/constants/addons.js` | Replace `EXTRA_REMINDERS_TIERS` |
| 9 | `labbe-backend-/src/modules/addons/addons.quota.js` | Add `extra_reminders` quota application |
| 10 | `labbe-backend-/src/modules/taqnyat-templates/taqnyat-templates.validation.js` | Add `type` enum to assign schema; add `listForHostQuerySchema` |
| 11 | `labbe-backend-/src/modules/taqnyat-templates/taqnyat-templates.service.js` | `assignMapping` uniqueness enforcement; `listForHost` type filter; new `findActiveByCategoryAndType` |
| 12 | `labbe-backend-/src/modules/taqnyat-templates/taqnyat-templates.controller.js` | Read `type` from query |
| 13 | `labbe-backend-/src/modules/taqnyat-templates/taqnyat-templates.routes.js` | Add query validator on host list |
| 14 | `labbe-backend-/src/modules/messaging/messaging.formatting.js` | `mapUrl` + `staff.*` in ctx |
| 15 | `labbe-backend-/src/modules/messaging/messaging.reminder.service.js` | Add `sendAutoReminderBatch` helper |
| 16 | `labbe-backend-/src/modules/events/events.staff.service.js` | Replace plain-SMS notification with Taqnyat template |
| 17 | `labbe-backend-/src/shared/utils/scheduledTasks.js` | Rewire 24h reminder; add `scheduleExtraReminderDispatcher`; init |
| 18 | `labbe-backend-/src/config/index.js` | Remove hardcoded reminder template name fallback |
| 19 | `labbe-backend-/src/modules/scheduled-extra-reminders/scheduled-extra-reminders.routes.js` | NEW |
| 20 | `labbe-backend-/src/modules/scheduled-extra-reminders/scheduled-extra-reminders.controller.js` | NEW |
| 21 | `labbe-backend-/src/modules/scheduled-extra-reminders/scheduled-extra-reminders.service.js` | NEW |
| 22 | `labbe-backend-/src/modules/scheduled-extra-reminders/scheduled-extra-reminders.validation.js` | NEW |
| 22b | `labbe-backend-/src/modules/events/events.crud.service.js` | Enrich `getEventById` response with `event.subscription.remindersRemaining/Pool/Consumed/Reserved` (Phase 9.8) |
| 23 | `labbe-backend-/src/app.js` (or wherever routes are mounted) | Register new module |
| 24 | `labbe/components/event-detail/*` | NEW shared component folder |
| 25 | `labbe/app/[lang]/host/events/[id]/page.jsx` | Refactor to use shared components |
| 26 | `labbe/app/[lang]/admin-dash/events/[id]/page.jsx` | Refactor to use shared components |
| 27 | `labbe/app/[lang]/host/events/[id]/_components/*` | DELETE (after extraction) |
| 28 | `labbe/app/[lang]/admin-dash/events/[id]/_components/*` | DELETE (after extraction) |
| 29 | `labbe/app/[lang]/admin-dash/taqnyat-templates/_components/AssignTaqnyatTemplatePopup.jsx` | Add Type dropdown, new source keys |
| 30 | `labbe/app/[lang]/admin-dash/taqnyat-templates/_components/TaqnyatTemplatesTable.jsx` | Add Type column |
| 31 | `labbe/utils/schemas/adminPopupSchemas.js` | Add `type` to assignTaqnyatSchema |
| 32 | `labbe/hooks/queries/useTaqnyatTemplates.js` | Add `type` to hook signature + queryKey |
| 33 | `labbe/services/taqnyatTemplatesService.js` | Add `type` query param |
| 34 | `labbe/hooks/queries/useScheduledExtraReminders.js` | NEW |
| 35 | `labbe/services/scheduledExtraRemindersService.js` | NEW |
| 36 | `labbe/services/new-backend/api.config.js` | Register new endpoints |
| 37 | `labbe/app/[lang]/host/create-event/_components/stepFour/StepFour.js` | Pass `type: 'invite'` to `useHostTaqnyatTemplates` |
| 38 | `labbe/localization/locales/en/admin.json` | New taqnyat keys |
| 39 | `labbe/localization/locales/ar/admin.json` | New taqnyat keys |
| 40 | `labbe/localization/locales/en/home-events.json` | scheduleReminder/autoReminderInfo/table cols |
| 41 | `labbe/localization/locales/ar/home-events.json` | Same in Arabic |
| 42 | `halla-mobile/screens/shared/EventDetailsScreen.js` | Move from `screens/admin/admin-dashboard/` |
| 43 | `halla-mobile/navigation/AppNavigator.js` | Add EventDetails route to HostStack |
| 44 | `halla-mobile/navigation/AdminNavigator.js` | Update import path |
| 45 | `halla-mobile/screens/host/EventsScreen.js` | Drop inline detail; navigate to EventDetails |
| 46 | `halla-mobile/components/events/EventDetails.js` | DELETE |
| 47 | `halla-mobile/components/events/SingleEventStats/` | DELETE folder |
| 48 | `halla-mobile/components/admin-dashboard/events/ScheduleReminderSection.js` | NEW |
| 49 | `halla-mobile/components/admin-dashboard/events/AutoReminderInfoText.js` | NEW |
| 50 | `halla-mobile/components/admin-dashboard/events/GuestList.js` | Add auto/extra reminder badges |
| 51 | `halla-mobile/components/admin-dashboard/events/AdminListItem.js` | Same |
| 52 | `halla-mobile/components/admin-dashboard/events/CreateEventForm.js` | Add `mode` prop; skip HostSelector when host |
| 53 | `halla-mobile/screens/host/CreateEventScreen.js` | Replace body with `<CreateEventForm mode="host" />` |
| 54 | `halla-mobile/components/createEvent/StepFour.js` | Pass `type: 'invite'` to `useHostTaqnyatTemplates` |
| 55 | `halla-mobile/services/taqnyatTemplatesService.js` | Add `type` to buildQuery |
| 56 | `halla-mobile/hooks/queries/useScheduledExtraReminders.js` | NEW |
| 57 | `halla-mobile/services/scheduledExtraRemindersService.js` | NEW |
| 58 | `halla-mobile/localization/locales/en/admin.json` | New taqnyat keys |
| 59 | `halla-mobile/localization/locales/ar/admin.json` | Same in Arabic |
| 60 | `halla-mobile/localization/locales/en/events.json` | scheduleReminder/autoReminderInfo |
| 61 | `halla-mobile/localization/locales/ar/events.json` | Same in Arabic |

---

## 18. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Cron stops sending reminders if admin forgets to tag a category | Cron audits `reminder.template_missing` per (category, type). Add a daily admin alert via the existing notification system if any active categories are missing templates. (Stretch — not included in initial scope.) |
| Quota race: two concurrent schedules drain the pool | `Subscription.reserveReminders` uses atomic `$expr`-guarded `$inc`. Throws `INSUFFICIENT_REMINDER_QUOTA` on race. |
| Partial dispatch (e.g., 100 guests, 30 fail) | `result.details` records per-guest outcomes. Failed sends are refunded from quota. UI shows "Partial" status. |
| Moving shared components breaks existing imports | Do the file moves in single atomic commits per page; run `npm run build` after each commit. |
| Deleting mobile legacy detail screen breaks navigation deep-links | Grep for `EventDetails` and `currentView === 'details'` references project-wide before deletion. Update any deep-link handlers. |
| Backward compat lost on `EXTRA_REMINDERS_TIERS` | User confirmed: we are in dev, no compat needed. Existing Addon rows keep their stored quantity/price for accurate historical accounting; only the catalog drops. |
| Whitelabel-scoped admins seeing other whitelabel events | Already prevented by `_buildScopedEventQuery`. The new endpoints reuse it. |
| Schedule reminder UI shown on event without subscription | `subscription.remindersRemaining` resolves to 0 → button hidden. Backend also rejects via `event.subscriptionId` check. |

---

## 19. Out of scope (explicit)

- Post-event templates (no templates added; type is recognised but no behavior changes for now).
- Notification of admins when a category is missing a reminder template (manual ops checklist only).
- Refund of historical price differences for users who bought extras at old `EXTRA_REMINDERS_TIERS` prices — dev mode, no production data to refund.
- Bulk schedule (scheduling reminders for multiple events at once) — not requested.

---

## 20. Sign-off checklist before merge

- [ ] All 14 phases implemented in the order in §16.
- [ ] Backend lint + tests pass.
- [ ] Web lint + typecheck + build pass.
- [ ] Mobile lint passes.
- [ ] Manual smoke (§15.2) green for both web host, web admin, and mobile (host & admin).
- [ ] Localization parity (EN + AR) for every new string.
- [ ] No remaining grep hits for `halaa_reminder_confirmed`, `halaa_reminder_declined`, `halaa_reminder_nudge`, `halaa_event_reminder_v2` (or any other `halaa_*` literal outside of test fixtures).
- [ ] Legacy mobile `components/events/EventDetails.js` and `SingleEventStats/` deleted; no broken imports.
- [ ] Ops team confirmed templates assigned before Phase 5/6 rollout.

— END OF PLAN —
