# Plans Rewrite — Implementation Plan (2026-05-26, rev. 2)

Source document: `)2( يئاهن_اله تاقاب.docx` (extracted to `plans.txt` via `extract_docx.js`).
**Status:** Dev environment, no backward compatibility required. DB will be dropped fresh.
All 5 open questions from prior review answered.

**Rev. 2 changes (after pre-implementation code review):**
- §7 — explicitly remove `BUSINESS_SETUP_FEE` re-export from `constants/index.js`
- §10 — mobile setup-fee path corrected (`screens/admin/WhitelabelPlansSummaryScreen.js`, not `screens/whitelabel/...` — the latter doesn't exist; mobile currently undercharges by 1,200 SAR, fix included)
- §11 — Zod schema rewritten field-by-field (was vague)
- §14 — email-template wording corrected (no live callers pass `features` today)
- §15 — added missing files: `halla-mobile/components/plans/_components/featuresMap.js`, `BusinessPlanCard.js`, `HostPlanCard.js`, `PlanFeatureRow.js`; backend `constants/index.js`; web `EditPlanPopup.js`/`PlanFeatureTogglesSection.js`; locale `admin.json` keys
- §16 — seed-script EXPECTED counts update added as explicit step (total **54 plans**, not the earlier handwave of 51)
- §17 — `_formatPlan` API response contract clarified; `req.subscription.features` consumer audit; `PLAN_CODES` add/remove enumerated
- §19 (new) — full `PLAN_CODES` diff
- §20 (new) — `featuresArray` consumer migration table
- §21 (new) — pre-flight sanity checklist before `node scripts/seedPlans.js`

---

## 0. Final decisions (locked)

| # | Decision | Outcome |
|---|---|---|
| 1 | Drop `hasCompensationInvites`? | **Yes.** Compensation is universal at 15%, hardcoded via constant. |
| 2 | Drop `priorityPoints`? | **Yes.** Never read. |
| 3 | Drop `compensationPercentage` per-plan? | **Yes.** Use single `COMPENSATION_PERCENTAGE = 15` constant everywhere. |
| 4 | Drop migration & start fresh? | **Yes.** No `$unset` script needed — `db.dropDatabase()` then `seedPlans`. |
| 5 | Locales split — structural strings in i18n, bullets in DB? | **Confirmed.** |
| 6 | Keep `whatsAppTemplates`? | **Yes.** Numeric, displayed (1 / 3 / 5). |
| 7 | `setupFeeAmount` per-plan or global constant? | **Per-plan field on Plan.** Replaces `BUSINESS_SETUP_FEE` global. |
| 8 | New `freeInvitesIncluded` field? | **NOT NEEDED.** `limits.invitePool` already stores this (500 / 2000). |

---

## 1. Final flag set after cleanup

The `featuresSchema` shrinks to a single field:

```js
const featuresSchema = new mongoose.Schema(
  {
    whatsAppTemplates: { type: Number, default: 0 }, // Business: 1 / 3 / 5
  },
  { _id: false }
);
```

Everything else lives elsewhere:
- `limits.*` — unchanged (maxEvents, maxInvitesPerEvent, invitePool, durationDays, maxHosts)
- `setupFeeAmount` — **new top-level field on Plan** (Number, default 0)
- `featureBullets` — **new top-level field on Plan** (object with `ar` and `en` String arrays)
- Compensation — **hardcoded `COMPENSATION_PERCENTAGE = 15` constant**, not stored per-plan
- Differentiators (managed-service, branding, official sender, etc.) — derived from `planFamily` (`basic` / `premium` / `business`) when needed by middleware in the future

**Dropped from schema entirely:**
- `hasInAppInvites`, `hasWhatsAppInvites`, `hasSMSInvites`
- `hasQRCode`, `hasQRScanning`, `hasFlexibleEntryMode`
- `hasStaffCheckIn`, `hasStaffAssignment`
- `hasRSVPTracking`, `hasAutoReminders`, `hasEmailNotifications`
- `hasCustomWhatsAppNumber`, `hasOfficialSenderNumber`
- `hasCustomWebPage`, `hasMessageTracking`
- `hasCompensationInvites`, `compensationPercentage`
- `hasBasicTemplates`, `hasPremiumTemplates`, `hasPostEventPage`, `hasCustomReports`
- `priorityPoints`, `hasWhatsAppSupport`
- `subscriptionSchema.methods.hasFeature()` (never called)

---

## 2. Invite tiers — final list per variant

Following user direction "make the DB exactly as the file" — the doc lists one tier
sequence for individuals (25–400), applied to both event and monthly variants. Business
event mirrors the same individual tier sequence.

| Variant | Tiers | Change |
|---|---|---|
| Basic event       | 25, 50, 75, 100, 150, 200, 250, 300, **350**, **400** | +350, +400 |
| Basic monthly     | **25**, **50**, **75**, 100, 150, 200, 250, 300, **350**, **400** | +25, +50, +75, +350, +400 |
| Premium event     | 25, 50, 75, 100, 150, 200, 250, 300, **350**, **400** | +350, +400 |
| Premium monthly   | **25**, **50**, **75**, 100, 150, 200, 250, 300, **350**, **400** | +25, +50, +75, +350, +400 |
| Business event    | **25**, **50**, **75**, 100, 150, 200, **250**, 300, **350**, 400 | +25, +50, +75, +250, +350, **−500** |
| Business 3-month  | single plan, `invitePool: 500`                          | unchanged |
| Business annual   | single plan, `invitePool: 2000`                         | unchanged |

---

## 3. Pricing derivation for new tiers

### Per-invite rates extracted from existing DB (`planDefaults.js`):

**Basic event** — graduated at small tiers, then flat 3.50 SAR/invite:
```
25=95  (3.80)  50=185 (3.70)  75=270 (3.60)
100=350 (3.50)  150=525  200=700  250=875  300=1050   ← all 3.50/invite
```

**Basic monthly** — flat 4.50 SAR/invite from 100 up:
```
100=450  150=675  200=900  250=1125  300=1350   ← all 4.50/invite
```

**Premium event** — graduated then flat 4.50 SAR/invite:
```
25=120 (4.80)  50=235 (4.70)  75=345 (4.60)
100=450 (4.50)  150=675  200=900  250=1125  300=1350   ← all 4.50/invite
```

**Premium monthly** — flat 5.40 SAR/invite:
```
100=540  150=810  200=1080  250=1350  300=1620   ← all 5.40/invite
```

**Business event** — graduated then flat 3.50 SAR/invite:
```
100=370 (3.70)  150=540 (3.60)  200=700 (3.50)
300=1050  400=1400  500=1750   ← all 3.50/invite
```

### Proposed pricing for new tiers (following the existing curves)

| Variant            | Tier | Price (SAR) | Per-invite | Rationale |
|--------------------|------|------------:|-----------:|-----------|
| Basic event        | 350  | **1,225**   | 3.50       | bulk rate |
| Basic event        | 400  | **1,400**   | 3.50       | bulk rate |
| Basic monthly      | 25   | **125**     | 5.00       | small premium (+11% vs 4.50) |
| Basic monthly      | 50   | **240**     | 4.80       | small premium |
| Basic monthly      | 75   | **350**     | 4.67       | small premium |
| Basic monthly      | 350  | **1,575**   | 4.50       | bulk rate |
| Basic monthly      | 400  | **1,800**   | 4.50       | bulk rate |
| Premium event      | 350  | **1,575**   | 4.50       | bulk rate |
| Premium event      | 400  | **1,800**   | 4.50       | bulk rate |
| Premium monthly    | 25   | **150**     | 6.00       | small premium |
| Premium monthly    | 50   | **285**     | 5.70       | small premium |
| Premium monthly    | 75   | **420**     | 5.60       | small premium |
| Premium monthly    | 350  | **1,890**   | 5.40       | bulk rate |
| Premium monthly    | 400  | **2,160**   | 5.40       | bulk rate |
| Business event     | 25   | **100**     | 4.00       | follows basic-event small premium +5% |
| Business event     | 50   | **195**     | 3.90       | follows basic-event small premium +5% |
| Business event     | 75   | **285**     | 3.80       | follows basic-event small premium +5% |
| Business event     | 250  | **875**     | 3.50       | bulk rate |
| Business event     | 350  | **1,225**   | 3.50       | bulk rate |

Plus DB also gets quarterly fix: existing seed has `pricing.oneTime: 3500` for quarterly
but doc says **3,000 SAR**. Will correct to 3,000.

> **You can override any of these prices before I seed.** Send a tier→price override map and I'll apply it.

---

## 4. Updated bullet sets per plan (user-curated)

### Halaa Basic — bullets

Bullet 1 differs per variant (DIY scope), bullets 2–14 are identical, bullet 15 is a
dynamic display row (not stored — computed from `invitePool` × 15%).

**Basic event — `featureBullets.ar`:**
```
1.  إنشاء وإدارة المناسبة بالكامل من خلال تطبيق ومنصة هلا بواسطة العميل
2.  إدخال بيانات المدعوين يدويًا أو عبر رفع ملف
3.  إرسال الدعوات ذاتيًا عبر (تطبيق الواتساب أو الرسائل النصية SMS)
4.  إمكانية تعيين داعي إضافي للمناسبة
5.  إرسال تذكير تلقائي للمدعوين قبل المناسبة بيوم
6.  لوحة إحصائيات فورية توضح (القبول – الاعتذار – عدم الرد)
7.  توليد باركود دخول خاص لكل مدعو بالاسم ورقم الجوال (بحسب الرغبة)
8.  مسح باركود الدخول مباشرة من تطبيق هلا بدون الحاجة لأي جهاز إضافي
9.  إمكانية تعيين أي شخص كمشرف لمسح أكواد الدخول (مشرف البوابة)
10. الاختيار من مكتبة تصاميم جاهزة متنوعة تناسب جميع المناسبات أو طلب خدمة التصميم برسوم إضافية
11. إرسال تذكير تلقائي للمدعوين قبل المناسبة مع جدول توقيت الإرسال بناء على رغبة العميل
12. استقبال رسائل المدعوين (شكر – دعاء – تهنئة) داخل التطبيق
13. إرسال دعوة تجريبية قبل الإرسال النهائي وتفعيل ارسال جميع الدعوات
14. رصيد دعوات تعويضية في حال اعتذار المدعوين
```

**Basic monthly:** identical to event except bullet 1 reads:
```
1. إنشاء وإدارة عدد لا محدود من المناسبات بالكامل من خلال تطبيق ومنصة هلا بواسطة العميل
```

**Basic event — `featureBullets.en`:**
```
1.  Create and manage the entire event through the Halaa app and platform by the customer
2.  Add guest data manually or via file upload
3.  Send invitations independently via (WhatsApp or SMS)
4.  Ability to assign an additional inviter to the event
5.  Automatic reminder to guests one day before the event
6.  Real-time stats dashboard (acceptance – apology – no response)
7.  Generate a unique entry barcode for each guest by name and mobile number (optional)
8.  Scan entry barcodes directly from the Halaa app — no extra device needed
9.  Ability to assign anyone as a check-in supervisor (gate supervisor)
10. Choose from a library of ready-made designs covering all occasions, or request custom design for an additional fee
11. Automatic reminders to guests before the event with a customizable send-time schedule
12. Receive guest messages (thanks – prayers – congratulations) inside the app
13. Send a trial invitation before finalizing and activating bulk send
14. Compensation invites credit when guests apologize
```

**Basic monthly — EN bullet 1:** `Create and manage unlimited events through the Halaa app and platform by the customer`

---

### Halaa Premium — bullets

Per user note: compensation bullet removed (already in Basic). Event and monthly share
the same 6 bullets. Rendered after the "All Basic features +" heading.

**Premium — `featureBullets.ar`:** (same for event and monthly)
```
1. إدارة كاملة للمناسبة من قبل فريق دعم منصة هلا
2. إدخال وتنظيم بيانات المدعوين نيابةً عن العميل
3. إعداد وإرسال الدعوات ومتابعتها
4. ضبط التذكيرات والردود وتقارير الحضور
5. متابعة مباشرة لحالة الدعوات والتأكد من وصولها
6. دعم مخصص قبل وأثناء المناسبة
```

**Premium — `featureBullets.en`:**
```
1. Full event management by the Halaa platform support team
2. Guest data entry and organization on behalf of the customer
3. Invitation preparation, sending, and follow-up
4. Reminder, response, and attendance reporting setup
5. Direct tracking of invitation delivery status
6. Dedicated support before and during the event
```

Premium monthly bullet 1 in the EN reads the same (the "unlimited events" scope is
implicit in the variant blurb under the tagline, not in this bullet).

---

### Halaa Business — bullets (user-curated, dropped 4 bullets)

User explicitly removed: تتبع حالة الرسائل, لوحة تحكم احترافية, إدارة كاملة لإرسال الدعوات,
رصيد دعوات تعويضية (compensation again, since universal), ومدير خاص للحساب.

**Business — `featureBullets.ar`:** (same for event, 3-month, and annual)
```
1. إدارة كاملة لحساب المنشأة من قبل فريق دعم منصة هلا
2. جميع مميزات باقات الأفراد
3. خدمة عملاء مميزة
4. إرسال الدعوات باسم ورقم الجوال الرسمي للجهة (يتطلب الربط مع مزود خدمة الواتساب ورسوم إضافية)
5. تخصيص صفحة ويب خاصة للدعوة بألوان وهوية الجهة مع إضافة الشعار الرسمي
6. تصميم الدعوات بما يتوافق مع ثيم المناسبة وهوية الجهة
7. تخصيص قوالب رسائل واتساب معتمدة باسم الجهة
8. دعم فعاليات متعددة من نفس الحساب
```

**Business — `featureBullets.en`:**
```
1. Full account management by the Halaa platform support team
2. All features of the individual plans included
3. Premium customer service
4. Send invitations under the organization's official name and mobile number (requires WhatsApp Business provider integration and additional fees)
5. Custom-branded invitation web page with the organization's colors, identity, and official logo
6. Invitation designs aligned with the event theme and organization identity
7. Custom WhatsApp message templates approved under the organization's name
8. Multi-event support from the same account
```

**Variant-specific extras** (rendered as a separate visual row below bullets, sourced
from numeric fields, not stored as bullet strings):

| Variant | `pricing.oneTime` | `setupFeeAmount` | `limits.invitePool` | `features.whatsAppTemplates` |
|---|---:|---:|---:|---:|
| Business event (per tier)  | varies (table §3) | 1,200 | null | 1 |
| Business 3-month           | 3,000             | 0 (included) | 500 | 3 |
| Business annual            | 10,000            | 0 (included) | 2,000 | 5 |

---

## 5. Description JSX component (shared design)

One component on web (`labbe/ui/plans/PlanDescription/PlanDescription.jsx`) and a mobile
mirror (`halla-mobile/components/plans/PlanDescription.js`).

**Render contract:**

```jsx
<PlanDescription plan={plan} lang={lang} selectedInviteCount={n} />
```

**Visual structure (top to bottom):**

1. **Family tagline** (bold, brand-coloured) — **VERBATIM from doc**, not paraphrased.
   - Basic AR:    `تحكم كامل بمناسبتك… تدير كل شيء بنفسك وبخطوات غاية في السهولة!`
   - Basic EN:    `Full control of your event — manage everything yourself with the easiest steps!`
   - Premium AR:  `مناسبتك علينا .. نحن ندير كل شي بالنيابة عنك من أول دعوة إلى آخر ضيف.`
   - Premium EN:  `Your event is on us — we manage everything on your behalf, from the first invitation to the last guest.`
   - Business AR: `إدارة احترافية للدعوات والفعاليات المؤسسية بهوية الجهة الرسمية عبر فريق هلا – الخيار الأمثل للشركات وأصحاب الفعاليات الكبرى والمتكررة والمنظمات`
   - Business EN: `Professional management of invitations and corporate events with the organization's official brand identity through the Halaa team — the ideal choice for companies, organizers of large recurring events, and organizations.`
   - Source: i18n key `plans.taglines.{basic|premium|business}`

2. **Variant blurb + duration line** (computed, not stored)
   - Event variants: `t('plans.duration.event', { days: plan.limits.durationDays })` → `"مدة الصلاحية ٩٠ يومًا"` / `"Valid for 90 days"`
   - Monthly: `t('plans.duration.monthly')` → `"اشتراك شهري — مناسبات غير محدودة"` / `"Monthly subscription — unlimited events"`
   - Quarterly: `t('plans.duration.quarterly', { days: 90 })` → `"اشتراك ٣ أشهر"`
   - Annual: `t('plans.duration.annual')` → `"اشتراك سنوي"`

3. **Bullet list** — `plan.featureBullets[lang].map(...)` with check icon

4. **Premium/Business prefix heading** (rendered above the bullet list when applicable)
   - Premium: `"All Basic features +"` (i18n key `plans.includes.basic`)
   - Business: `"All Basic features +"` as well (user already includes "جميع مميزات باقات الأفراد" as bullet #2, so no extra heading needed — bullet #2 conveys it)

5. **Dynamic compensation row** (computed, not in bullets array):
   ```
   رصيد ١٥ دعوة تعويضية = ١٥٪ من ١٠٠ دعوة
   = 15 compensation invites (15% of 100 invites)
   ```
   - For event plans: `Math.floor(maxInvitesPerEvent × 0.15)` using the user's currently-selected tier
   - For pool plans (monthly/quarterly/annual): `Math.floor(invitePool × 0.15)`

6. **Setup fee row** (only if `plan.setupFeeAmount > 0`):
   - `"رسوم تأسيس لمرة واحدة: ١٢٠٠ ر.س"` / `"One-time setup fee: 1,200 SAR"`

7. **Free invites row** (only if `plan.billingType !== 'event'` and `plan.limits.invitePool > 0`):
   - `"يشمل ٥٠٠ دعوة مجانية خلال مدة الاشتراك"` / `"Includes 500 free invitations during the subscription period"`

8. **WhatsApp templates row** (only if `plan.features.whatsAppTemplates > 0`):
   - `t('plans.whatsappTemplates', { count: 3 })` → `"٣ قوالب واتساب مخصصة"` / `"3 custom WhatsApp templates"`

---

## 6. PlanModel — final schema (code snippet)

```js
// models/PlanModel.js

const featuresSchema = new mongoose.Schema(
  {
    whatsAppTemplates: { type: Number, default: 0 },
  },
  { _id: false }
);

const pricingSchema = new mongoose.Schema(
  {
    oneTime: { /* unchanged — SAR validator */ },
  },
  { _id: false }
);

const limitsSchema = new mongoose.Schema(
  {
    maxEvents: { type: Number, default: 1 },
    maxInvitesPerEvent: { type: Number, default: null },
    invitePool: { type: Number, default: null },
    durationDays: { type: Number, default: 90 },
    maxHosts: { type: Number, default: null },
  },
  { _id: false }
);

const featureBulletsSchema = new mongoose.Schema(
  {
    ar: { type: [String], default: [] },
    en: { type: [String], default: [] },
  },
  { _id: false }
);

const planSchema = new mongoose.Schema(
  {
    code:       { type: String, required: true, unique: true, trim: true },
    planType:   { type: String, enum: [...], required: true },     // unchanged enum
    planFamily: { type: String, enum: ['basic','premium','business', null], default: null },
    billingType:{ type: String, enum: ['event','monthly','quarterly','annual', null], default: null },
    availableFor:{ type: String, enum: ['host','whitelabel','platform_admin'], default: 'host' },

    nameAr:        { type: String, required: true },
    nameEn:        { type: String, required: true },
    descriptionAr: String,        // short tagline only (optional fallback)
    descriptionEn: String,

    pricing:  { type: pricingSchema, required: true },
    currency: { type: String, default: 'SAR', enum: [...] },

    limits:   { type: limitsSchema,   required: true },
    features: { type: featuresSchema, required: true },

    setupFeeAmount: { type: Number, default: 0, min: 0 },   // NEW: was global constant
    featureBullets: { type: featureBulletsSchema, default: () => ({ ar: [], en: [] }) }, // NEW

    isPopular: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    isActive:  { type: Boolean, default: true },
    isPublic:  { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);
```

Deleted from previous schema: `featuresSchema` shrank from 24 fields to 1.

---

## 7. Updated backend constants (`shared/constants/plans.js` + `shared/constants/index.js`)

**Remove from `plans.js`:**
- `FEATURE_LABELS` constant + `buildFeaturesArray()` helper
- `BUSINESS_SETUP_FEE` constant (replaced by per-plan `setupFeeAmount`)

**Remove from `constants/index.js`** (currently re-exports both, lines 15–16 and 37):
- `BUSINESS_SETUP_FEE` from the destructured `require('./plans')` and from `module.exports`

**Update `PLAN_CODES` enum in `plans.js`** — see §19 for the exact add/remove list. Without this, `planDefaults.js` references undefined identifiers and crashes at require-time.

**Keep:**
- `COMPENSATION_PERCENTAGE = 15` (now THE single source of truth)
- `PLAN_TYPES`, `PLAN_FAMILIES`, `PLAN_AVAILABILITY`, `BILLING_TYPES`
- `isPerEventPlan`, `isPoolPlan`, `isManagedPlan`, `getPlanFamily`, `getBillingType` predicates

---

## 8. Updated `planDefaults.js` (snippet — abbreviated, real file shown in PR)

```js
const { PLAN_CODES, PLAN_TYPES, PLAN_AVAILABILITY } = require('./plans');

// ============ BULLET SETS ============
const BASIC_EVENT_BULLETS_AR   = [ /* 14 bullets, see §4 */ ];
const BASIC_MONTHLY_BULLETS_AR = [ /* bullet 1 swapped + 13 shared */ ];
const PREMIUM_BULLETS_AR       = [ /* 6 bullets */ ];
const BUSINESS_BULLETS_AR      = [ /* 8 bullets */ ];
const BASIC_EVENT_BULLETS_EN   = [ /* … */ ];
// … etc

// ============ FACTORIES ============
const basicEventPlan = (invites, price) => ({
  code: `basic_event_${invites}`,
  nameAr: `هلا بيسك ${invites} دعوة`,
  nameEn: `Halaa Basic ${invites} Invites`,
  planType: PLAN_TYPES.BASIC_EVENT,
  planFamily: 'basic',
  billingType: 'event',
  availableFor: PLAN_AVAILABILITY.HOST,
  pricing: { oneTime: price },
  currency: 'SAR',
  limits: { maxEvents: 1, maxInvitesPerEvent: invites, invitePool: null, durationDays: 90 },
  features: { whatsAppTemplates: 0 },
  setupFeeAmount: 0,
  featureBullets: { ar: BASIC_EVENT_BULLETS_AR, en: BASIC_EVENT_BULLETS_EN },
});

const basicMonthlyPlan = (pool, price) => ({
  code: `basic_monthly_${pool}`,
  nameAr: `هلا بيسك شهري ${pool} دعوة`,
  nameEn: `Halaa Basic Monthly ${pool} Invites`,
  planType: PLAN_TYPES.BASIC_MONTHLY,
  planFamily: 'basic',
  billingType: 'monthly',
  availableFor: PLAN_AVAILABILITY.HOST,
  pricing: { oneTime: price },
  currency: 'SAR',
  limits: { maxEvents: -1, maxInvitesPerEvent: null, invitePool: pool, durationDays: 30 },
  features: { whatsAppTemplates: 0 },
  setupFeeAmount: 0,
  featureBullets: { ar: BASIC_MONTHLY_BULLETS_AR, en: BASIC_MONTHLY_BULLETS_EN },
});

const businessEventPlan = (invites, price) => ({
  code: `business_event_${invites}`,
  nameAr: `هلا أعمال ${invites} دعوة`,
  nameEn: `Halaa Business ${invites} Invites`,
  planType: PLAN_TYPES.BUSINESS_EVENT,
  planFamily: 'business',
  billingType: 'event',
  availableFor: PLAN_AVAILABILITY.WHITELABEL,
  pricing: { oneTime: price },
  currency: 'SAR',
  limits: { maxEvents: 1, maxInvitesPerEvent: invites, invitePool: null, durationDays: 90 },
  features: { whatsAppTemplates: 1 },        // doc: 1 for single-event business
  setupFeeAmount: 1200,                       // doc: 1,200 SAR
  featureBullets: { ar: BUSINESS_BULLETS_AR, en: BUSINESS_BULLETS_EN },
});

const PLAN_DEFAULTS = {
  [PLAN_CODES.TRIAL]: { /* unchanged structure, trial gets a short bullet array */ },

  // ─── Basic event (10 tiers) ────────────────────────────
  basic_event_25:  basicEventPlan(25,  95),
  basic_event_50:  basicEventPlan(50,  185),
  basic_event_75:  basicEventPlan(75,  270),
  basic_event_100: basicEventPlan(100, 350),
  basic_event_150: basicEventPlan(150, 525),
  basic_event_200: basicEventPlan(200, 700),
  basic_event_250: basicEventPlan(250, 875),
  basic_event_300: basicEventPlan(300, 1050),
  basic_event_350: basicEventPlan(350, 1225),     // NEW
  basic_event_400: basicEventPlan(400, 1400),     // NEW

  // ─── Basic monthly (10 tiers) ──────────────────────────
  basic_monthly_25:  basicMonthlyPlan(25,  125),   // NEW
  basic_monthly_50:  basicMonthlyPlan(50,  240),   // NEW
  basic_monthly_75:  basicMonthlyPlan(75,  350),   // NEW
  basic_monthly_100: basicMonthlyPlan(100, 450),
  basic_monthly_150: basicMonthlyPlan(150, 675),
  basic_monthly_200: basicMonthlyPlan(200, 900),
  basic_monthly_250: basicMonthlyPlan(250, 1125),
  basic_monthly_300: basicMonthlyPlan(300, 1350),
  basic_monthly_350: basicMonthlyPlan(350, 1575),  // NEW
  basic_monthly_400: basicMonthlyPlan(400, 1800),  // NEW

  // ─── Premium event (10 tiers) ──────────────────────────
  premium_event_25:  premiumEventPlan(25,  120),
  premium_event_50:  premiumEventPlan(50,  235),
  premium_event_75:  premiumEventPlan(75,  345),
  premium_event_100: premiumEventPlan(100, 450),
  premium_event_150: premiumEventPlan(150, 675),
  premium_event_200: premiumEventPlan(200, 900),
  premium_event_250: premiumEventPlan(250, 1125),
  premium_event_300: premiumEventPlan(300, 1350),
  premium_event_350: premiumEventPlan(350, 1575), // NEW
  premium_event_400: premiumEventPlan(400, 1800), // NEW

  // ─── Premium monthly (10 tiers) ────────────────────────
  premium_monthly_25:  premiumMonthlyPlan(25,  150),  // NEW
  premium_monthly_50:  premiumMonthlyPlan(50,  285),  // NEW
  premium_monthly_75:  premiumMonthlyPlan(75,  420),  // NEW
  premium_monthly_100: premiumMonthlyPlan(100, 540),
  premium_monthly_150: premiumMonthlyPlan(150, 810),
  premium_monthly_200: premiumMonthlyPlan(200, 1080),
  premium_monthly_250: premiumMonthlyPlan(250, 1350),
  premium_monthly_300: premiumMonthlyPlan(300, 1620),
  premium_monthly_350: premiumMonthlyPlan(350, 1890), // NEW
  premium_monthly_400: premiumMonthlyPlan(400, 2160), // NEW

  // ─── Business event (10 tiers, 500 removed) ────────────
  business_event_25:  businessEventPlan(25,  100),    // NEW
  business_event_50:  businessEventPlan(50,  195),    // NEW
  business_event_75:  businessEventPlan(75,  285),    // NEW
  business_event_100: businessEventPlan(100, 370),
  business_event_150: businessEventPlan(150, 540),
  business_event_200: businessEventPlan(200, 700),
  business_event_250: businessEventPlan(250, 875),    // NEW
  business_event_300: businessEventPlan(300, 1050),
  business_event_350: businessEventPlan(350, 1225),   // NEW
  business_event_400: businessEventPlan(400, 1400),
  // business_event_500 — REMOVED

  // ─── Business time-based ───────────────────────────────
  business_quarterly: {
    code: 'business_quarterly',
    nameAr: 'هلا أعمال — اشتراك ٣ أشهر',
    nameEn: 'Halaa Business — 3-Month Subscription',
    planType: PLAN_TYPES.BUSINESS_QUARTERLY, planFamily: 'business', billingType: 'quarterly',
    availableFor: PLAN_AVAILABILITY.WHITELABEL,
    pricing: { oneTime: 3000 },                        // FIXED: was 3500, doc says 3000
    currency: 'SAR',
    limits: { maxEvents: -1, maxInvitesPerEvent: null, invitePool: 500, durationDays: 90 },
    features: { whatsAppTemplates: 3 },
    setupFeeAmount: 0,                                  // included in plan price
    featureBullets: { ar: BUSINESS_BULLETS_AR, en: BUSINESS_BULLETS_EN },
  },

  business_annual: {
    code: 'business_annual',
    nameAr: 'هلا أعمال — اشتراك سنوي',
    nameEn: 'Halaa Business — Annual Subscription',
    planType: PLAN_TYPES.BUSINESS_ANNUAL, planFamily: 'business', billingType: 'annual',
    availableFor: PLAN_AVAILABILITY.WHITELABEL,
    pricing: { oneTime: 10000 },
    currency: 'SAR',
    limits: { maxEvents: -1, maxInvitesPerEvent: null, invitePool: 2000, durationDays: 365 },
    features: { whatsAppTemplates: 5 },
    setupFeeAmount: 0,                                  // included in plan price
    featureBullets: { ar: BUSINESS_BULLETS_AR, en: BUSINESS_BULLETS_EN },
  },

  unlimited: { /* platform admin — short minimal bullet array */ },
};
```

---

## 9. Updated compensation logic (replace `hasCompensationInvites` check)

**`labbe-backend-/models/SubscriptionModel.js:583`** (was):
```js
const compensationPercentage = plan.features?.compensationPercentage ?? 10;
const compensationPool = invitePool
  ? Math.floor(invitePool * compensationPercentage / 100)
  : 0;
```
→ becomes:
```js
const { COMPENSATION_PERCENTAGE } = require('../src/shared/constants/plans');
const compensationPool = invitePool
  ? Math.floor(invitePool * COMPENSATION_PERCENTAGE / 100)
  : 0;
```

**`labbe-backend-/src/modules/subscriptions/subscriptions.service.js:159-167`** (was):
```js
let compensationInvites = 0;
if (
  subscription.features?.hasCompensationInvites &&
  maxGuests > 0 &&
  maxGuests !== -1
) {
  const percentage = subscription.features?.compensationPercentage || COMPENSATION_PERCENTAGE;
  compensationInvites = Math.floor(maxGuests * (percentage / 100));
}
```
→ becomes:
```js
const compensationInvites =
  maxGuests > 0 && maxGuests !== -1
    ? Math.floor(maxGuests * (COMPENSATION_PERCENTAGE / 100))
    : 0;
```

**`labbe-backend-/src/modules/plans/plans.service.js:377-393`** (compensation pool builder)
— same swap, drop the per-plan field, read the constant.

**`labbe-backend-/src/modules/dashboard/dashboard.service.js:410`** — same swap.

---

### 9b. Compensation-pool persistence (Subscription documents)

`SubscriptionModel.compensationPool` (line 93) stays as a stored field — it is read by
`invitesRemaining` virtual (line 203), `consumeInvites` aggregation (line 609), and the
expiry sweeper (line 717). Only the **computation** changes: `createForUser` (line 583)
now uses the constant. Migration is unnecessary because the DB is dropped fresh.

`assignAdminUnlimitedPlan.js:88` sets `existingSub.compensationPool = null` for the
unlimited plan — leave as-is (admin-only, doesn't render publicly).

---

## 10. Setup-fee migration from global to per-plan

**Backend — `labbe-backend-/src/modules/plans/plans.service.js:44-45`** (was):
```js
return {
  event: eventPlans,
  quarterly: quarterlyPlan ? [quarterlyPlan] : [],
  annual:    annualPlan ? [annualPlan] : [],
  setupFeeRequired: true,
  setupFeeAmount: BUSINESS_SETUP_FEE,        // global constant
};
```
→ becomes:
```js
return {
  event: eventPlans,
  quarterly: quarterlyPlan ? [quarterlyPlan] : [],
  annual:    annualPlan ? [annualPlan] : [],
  // setupFee fields removed from wrapper — each plan now carries plan.setupFeeAmount
};
```

**Frontend — `labbe/ui/auth/signup/whiteLabel/stepSix/StepSix.js:29-36`** (was):
```js
const setupFee = businessData.setupFeeRequired
  ? businessData.setupFeeAmount || 0
  : 0;
const showSetupFee = !isPoolPlan && setupFee > 0;
const totalPrice = planPrice + (showSetupFee ? setupFee : 0);
```
→ becomes:
```js
const setupFee = selectedPlan?.setupFeeAmount || 0;
const totalPrice = planPrice + setupFee;     // setupFee is 0 for time-based plans, 1200 for event
```

(Same change in the StepFive preview and the `app/[lang]/admin-dash/plans/page.js`.)

**Mobile** — `halla-mobile/components/plans/PlanSummaryCard.js` already reads from
`selectedPlan.compensationPercentage` (line 42) — switch to the constant.

**⚠️ Mobile setup-fee bug** — `halla-mobile/screens/admin/WhitelabelPlansSummaryScreen.js`
**does not currently apply any setup fee** (line 36: `planPrice = parseFloat(selectedPlan?.pricing?.oneTime)`,
final total = `planPrice - discountAmt`). This is a pre-existing bug — the mobile whitelabel
flow undercharges by 1,200 SAR on event plans. Fix as part of this rewrite:

```js
const planPrice = parseFloat(selectedPlan?.pricing?.oneTime) || 0;
const setupFee  = parseFloat(selectedPlan?.setupFeeAmount)  || 0;
const subtotal  = planPrice + setupFee;
const discountAmt = discountData?.discountAmount || 0;
const finalTotal  = Math.max(0, subtotal - discountAmt);
```

(There is no `screens/whitelabel/signup/` directory on mobile — the path referenced in
rev. 1 was incorrect. The summary screen above is the only mobile checkout surface for
whitelabel plans, and `PaymentSummaryCard` will need to render a setup-fee row when
`setupFeeAmount > 0`.)

---

## 11. Zod schemas — backend & web

**`labbe-backend-/src/modules/plans/plans.schemas.js`** — full rewrite. Drop every
boolean (`hasInAppInvites` … `hasCustomReports`), drop `compensationPercentage`,
drop `priorityPoints`. Keep only `whatsAppTemplates`. Add `featureBullets` and
top-level `setupFeeAmount`.

```js
const featuresSchema = z.object({
  whatsAppTemplates: z.number().int().min(0).max(100).optional(),
}).strict();

const featureBulletsSchema = z.object({
  ar: z.array(z.string().min(1).max(500)).max(50).default([]),
  en: z.array(z.string().min(1).max(500)).max(50).default([]),
}).strict();

const createPlanSchema = z.object({
  code: planCode,
  planType: planTypeEnum,
  nameAr: z.string().trim().min(1, 'nameAr is required'),
  nameEn: z.string().trim().min(1, 'nameEn is required'),

  pricing: pricingSchema,
  limits: limitsSchema,
  features: featuresSchema,

  // NEW top-level fields
  setupFeeAmount: z.number().min(0).optional(),
  featureBullets: featureBulletsSchema.optional(),

  descriptionAr: z.string().trim().optional(),
  descriptionEn: z.string().trim().optional(),
  currency: currencyEnum.optional(),
  availableFor: availabilityEnum.optional(),
  planFamily: planFamilyEnum.nullable().optional(),
  billingType: billingTypeEnum.nullable().optional(),

  sortOrder: z.number().int().optional(),
  isPopular: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
}).strict();

const updatePlanSchema = createPlanSchema
  .omit({ code: true, planType: true })
  .partial()
  .strict();
```

**`labbe/utils/schemas/planSchema.js`** (current file has the full boolean set at
line 88-128 mirroring the backend) — apply the same purge: drop all 20+ boolean
fields, drop `compensationPercentage` (line 117) and `priorityPoints`, keep
`whatsAppTemplates`, add `setupFeeAmount` and `featureBullets`.

---

## 12. Frontend rendering changes

### Web — `labbe/ui/landing/PricingSection/PricingSection.jsx`

**Before:** bullets sourced from `t('pricing.basicFeatures')` array in `landing.json`,
plus inline conditional bullets based on `plan.features.has*` booleans.

**After:** Single source — `plan.featureBullets[lang]`. The PricingSection imports the new
`<PlanDescription>` component and passes the plan + selected invite count:

```jsx
import PlanDescription from '@/ui/plans/PlanDescription/PlanDescription';

// inside the card:
<PlanDescription
  plan={selectedBasicPlan}
  lang={lang}
  selectedInviteCount={selectedBasicPlan.limits.maxInvitesPerEvent ?? selectedBasicPlan.limits.invitePool}
/>
```

Same swap for premium, business event, quarterly, annual cards.

### Web — admin "Edit Plan" form

`labbe/app/[lang]/admin-dash/manage-plans/_components/edit-plan/PlanFeaturesSection.js`
(currently ~20 boolean toggles) becomes:

```jsx
// Renders two textareas (one per language) + a numeric input row.
<Section title={t('managePlans.editPopup.sections.featureBullets')}>
  <TextareaPerLine
    name="featureBullets.ar"
    label={t('managePlans.editPopup.fields.featureBulletsAr.label')}
    placeholder={t('managePlans.editPopup.fields.featureBulletsAr.placeholder')}
    helperText={t('managePlans.editPopup.fields.featureBulletsAr.help')}
  />
  <TextareaPerLine
    name="featureBullets.en"
    label={t('managePlans.editPopup.fields.featureBulletsEn.label')}
    placeholder={t('managePlans.editPopup.fields.featureBulletsEn.placeholder')}
  />
</Section>
```

`PlanFeatureNumericsSection.js` keeps `whatsAppTemplates` and adds `setupFeeAmount`. The
`compensationPercentage` numeric input is **removed**.

### Mobile — analogous changes

- `halla-mobile/screens/host/PlansScreen.js` — render `<PlanDescription>` instead of inline bullets
- `halla-mobile/screens/admin/WhitelabelPlansScreen.js` — same
- `halla-mobile/components/admin-dashboard/plans/EditPlanModal.js` — boolean toggles → textareas + `setupFeeAmount` numeric

---

## 13. Locale changes (web + mobile, AR + EN)

### Keys to REMOVE (no longer needed — bullets live in DB)
- `labbe/localization/locales/{ar,en}/landing.json` → `pricing.basicFeatures.*`, `pricing.premiumFeatures.*`, `pricing.businessFeatures.*` (every per-bullet key)
- Same purge in `signup.json`, `continueSignup.json`, `businessPlans.json`
- Mobile: `halla-mobile/localization/locales/{ar,en}/plans.json` → same purge

### Keys to ADD (structural strings only)
```json
{
  "plans": {
    "taglines": {
      "basic":    "Full control of your event — you manage everything yourself",
      "premium":  "Your event, on us — we handle everything for you",
      "business": "Professional invitation and event management with your official brand identity"
    },
    "duration": {
      "event":     "Valid for {{days}} days",
      "monthly":   "Monthly subscription — unlimited events",
      "quarterly": "3-month subscription",
      "annual":    "Annual subscription"
    },
    "includes": {
      "basic": "All Basic features +"
    },
    "compensationRow":   "{{count}} compensation invites ({{percent}}% of {{base}})",
    "setupFeeRow":       "One-time setup fee: {{amount}} SAR",
    "freeInvitesRow":    "Includes {{count}} free invitations during the subscription period",
    "whatsappTemplates": "{{count}} custom WhatsApp templates"
  }
}
```

(Arabic mirrors with same keys, RTL text.)

---

## 14. Email templates

`labbe-backend-/email/templates/subscriptions.js:148-150` and
`labbe-backend-/email/templates/whitelabels.js:104-106, 355-357` render `data.features`
as a list:
```js
${data.features.map((feature) => `<li>✓ ${feature}</li>`).join("")}
```

**Live caller audit** — grep of `whitelabelApproval(`, `subscriptionCreated(`, etc.
shows only `admin.whitelabels.service.js:223` calls these templates, and **it does
not pass a `features` field** (line 223-233: payload is `platformName / email /
setupPasswordUrl / dashboardUrl`). All three `data.features.map(...)` blocks are
currently dead branches guarded by `data.features && data.features.length > 0`.

**Action:** templates can stay as-is — they already accept a `string[]`. When a
future caller is wired up, pass `plan.featureBullets[user.preferredLang || 'ar']`.
No live-caller patch required for this rewrite. Add a `// TODO: callers should
pass plan.featureBullets[lang]` comment above each block and move on.

---

## 15. Full file-by-file list (verified against codebase 2026-05-26)

### Backend (`labbe-backend-/`, 12 files)
1. `models/PlanModel.js` — slim `featuresSchema` to only `whatsAppTemplates`; add `setupFeeAmount: Number` and `featureBullets: { ar:[String], en:[String] }` top-level fields
2. `models/SubscriptionModel.js`
   - Remove `hasFeature()` method (lines ~368-380, never called — verified via grep)
   - Rewrite `createForUser` compensation block (line 583) to use `COMPENSATION_PERCENTAGE` constant
   - `features` virtual at line 245 stays (delegates to `planId.features` — now just exposes `whatsAppTemplates`)
3. `src/shared/constants/plans.js`
   - Delete `FEATURE_LABELS` (lines 59-82), `buildFeaturesArray()` (lines 84-89), `BUSINESS_SETUP_FEE` (line 57)
   - Update `PLAN_CODES` enum per §19 (add 11, remove 1)
4. `src/shared/constants/index.js` — drop `BUSINESS_SETUP_FEE` from destructure (line 15) and from `module.exports` (line 37)
5. `src/shared/constants/planDefaults.js` — full rewrite per §8 (kill `BASE_FEATURES`/`PREMIUM_FEATURES`/`BUSINESS_FEATURES` blobs; each factory now sets only `whatsAppTemplates` + `setupFeeAmount` + `featureBullets`)
6. `src/modules/plans/plans.schemas.js` — full Zod rewrite per §11
7. `src/modules/plans/plans.service.js`
   - `getBusinessPlans()` (lines 40-46) — drop `setupFeeRequired` and `setupFeeAmount` wrapper fields
   - `_formatPlan()` (lines 374-397) — drop `featuresArray: buildFeaturesArray(...)`, drop `compensationPercentage` (line 393); keep `compensationPool` (now computed from constant); add `setupFeeAmount: plan.setupFeeAmount || 0` and `featureBullets: plan.featureBullets || { ar: [], en: [] }`
   - Lines 234, 250 — `features: existing.features?.toObject ...` keeps working (smaller object)
8. `src/modules/subscriptions/subscriptions.service.js` — compensation rewrite per §9 (lines 159-167)
9. `src/modules/dashboard/dashboard.service.js` — compensation rewrite per §9 (lines 405-413)
10. `src/shared/middleware/subscription.js` (line 84) — sets `req.subscription.features = subscription.planId?.features`. Grep confirms zero consumers read `req.subscription.features.has*` anywhere in the codebase, so this is a no-op safety check, not a code change. (Verified 2026-05-26.)
11. `src/config/swagger.js` — sync `Plan` schema (lines ~809, 935, 1017, 1073) to new field set: drop all boolean feature flags, drop `featuresArray` from `Plan`, drop `setupFeeRequired/setupFeeAmount` from `BusinessPlansResponse`, add top-level `setupFeeAmount` and `featureBullets` to `Plan`
12. `scripts/seedPlans.js`
   - `Plan.deleteMany({})` stays — but convert the create loop to **upsert by code** (`Plan.findOneAndUpdate({code}, {...}, {upsert:true, setDefaultsOnInsert:true})`) so re-running doesn't fail on unique-index collisions when the DB isn't fresh
   - Update hardcoded `EXPECTED` counts (lines 44-49):
     - `basic_event 8→10`, `basic_monthly 5→10`, `premium_event 8→10`, `premium_monthly 5→10`, `business_event 6→10` (added 25/50/75/250/350, removed 500)
     - `EXPECTED_TOTAL 36→54` (1 trial + 10×5 host/business event/monthly + 1 quarterly + 1 annual + 1 unlimited)

### Web (`labbe/`, 17 files)
1. `utils/schemas/planSchema.js` — Zod mirror of §11
2. NEW `ui/plans/PlanDescription/PlanDescription.jsx` + `.module.css`
3. `ui/landing/PricingSection/PricingSection.jsx`
   - Replace each `<FeatureList features={...featuresArray} />` with `<PlanDescription plan={...} lang={lang} selectedInviteCount={...} />` (7 call-sites: lines 317, 358, 403, 444, 486, 520, 555)
   - Drop the 7 `compensationPercentage` reads at lines 71, 145-159
   - Drop `whatsAppTemplates` inline rows at lines 511-512, 546-547 (handled by `PlanDescription` row #8)
4. `app/[lang]/host/plans/_hooks/usePlansPageState.js`
   - Drop `featuresArray` returns (lines 86, 93)
   - Drop `compensationPercentage` read (line 79) — switch to constant via shared util
5. `app/[lang]/host/plans/summary/_components/PlanSummaryCard.js` (line 15: `compensationPercentage ?? 10`) — switch to constant
6. `app/[lang]/admin-dash/manage-plans/_components/EditPlanPopup.js`
   - Drop `compensationPercentage` from form state (line 49)
   - Add `setupFeeAmount` to form state
   - Add `featureBullets: { ar: [...], en: [...] }` to form state
7. `app/[lang]/admin-dash/manage-plans/_components/edit-plan/PlanFeatureTogglesSection.js` — **DELETE FILE** (becomes obsolete; the booleans it manages no longer exist). Remove its import from `EditPlanPopup.js`.
8. NEW `app/[lang]/admin-dash/manage-plans/_components/edit-plan/PlanFeatureBulletsSection.js` — textarea-per-line widget for `featureBullets.ar` and `featureBullets.en`
9. `app/[lang]/admin-dash/manage-plans/_components/edit-plan/PlanFeatureNumericsSection.js`
   - Remove the `features.compensationPercentage` input (lines 22-40)
   - Add `setupFeeAmount` numeric input
   - Keep `features.whatsAppTemplates`
10. `app/[lang]/admin-dash/plans/page.js` — drop `featuresArray` reads (lines 22, 88); read `plan.setupFeeAmount` instead of any global constant
11. `ui/auth/signup/whiteLabel/stepFive/StepFive.js` — drop `featuresArray` reads (lines 18, 85); read `selectedPlan.setupFeeAmount`
12. `ui/auth/signup/whiteLabel/stepSix/StepSix.js` — replace `businessData.setupFeeRequired/setupFeeAmount` (lines 29-36) with `selectedPlan.setupFeeAmount`
13. `localization/locales/{ar,en}/landing.json` — delete `pricing.basicFeatures.*`, `pricing.premiumFeatures.*`, `pricing.businessFeatures.*`; keep/add `pricing.whatsappTemplates`, taglines, setup-fee row
14. `localization/locales/{ar,en}/signup.json` — purge per-bullet keys
15. `localization/locales/{ar,en}/continueSignup.json` — purge per-bullet keys
16. `localization/locales/{ar,en}/businessPlans.json` — purge per-bullet keys; keep `setupFee.*` row labels
17. `localization/locales/{ar,en}/admin.json` — delete `compensationPercentage` field (line 278), delete `hasCompensationInvites` and all `hasXyz` toggle labels (lines ~1028-1055), add `featureBulletsAr`/`featureBulletsEn` field labels and `setupFeeAmount` label
18. NEW `localization/locales/{ar,en}/plans.json` (or extend existing) — add `plans.taglines.*`, `plans.duration.*`, `plans.includes.basic`, `plans.compensationRow`, `plans.setupFeeRow`, `plans.freeInvitesRow`, `plans.whatsappTemplates`

### Mobile (`halla-mobile/`, 12 files)
1. NEW `components/plans/PlanDescription.js` + `styles.js`
2. `screens/host/PlansScreen.js`
   - Drop `featuresArray` reads (lines 95, 102) — render via `PlanDescription`
   - Drop `compensationPercentage ?? 15` (line 87) — `PlanDescription` handles compensation row from constant
3. `screens/admin/WhitelabelPlansScreen.js`
   - Drop `compensationPercentage ?? DEFAULT_COMPENSATION_PERCENTAGE` (line 29)
   - Drop `whatsAppTemplates` inline rendering (lines 191, 218) — covered by `PlanDescription`
4. `screens/admin/WhitelabelPlansSummaryScreen.js` (line 36) — **NEW**: apply `setupFeeAmount` to total (see §10). Pass `setupFee` down to `PaymentSummaryCard`
5. `components/plans/SummaryCards.js` (containing `PaymentSummaryCard`) — render a setup-fee row when `> 0`
6. `components/plans/PlanSummaryCard.js` (line 5, 42) — drop `DEFAULT_COMPENSATION_PERCENTAGE` import, switch to local 15 constant or hoist into shared util
7. `components/plans/HostPlanCard.js` (line 37) — drop `featuresArray` consumption; render via `PlanDescription` or simplify props
8. `components/plans/BusinessPlanCard.js` (lines 64-66) — drop `featuresArray` consumption; render via `PlanDescription`
9. `components/plans/_components/PlanFeatureRow.js` — **DELETE FILE** (renders `featuresArray` items; replaced by `PlanDescription` bullet rendering)
10. `components/plans/_components/featuresMap.js` — **DELETE FILE** (`FEATURE_MAP` of 13 boolean keys, all dropped from schema; verified no other importers besides `PlanFeatureRow.js`)
11. `components/admin-dashboard/plans/EditPlanModal.js`
   - Remove the `hasCompensationInvites` toggle from `BOOLEAN_FIELDS` (line 45)
   - Remove `compensationPercentage` form field (lines 75, 180, 344-346)
   - Add `setupFeeAmount` numeric input
   - Add `featureBullets.ar` / `featureBullets.en` multi-line textarea inputs
12. `utils/constants/plans.js` — drop `DEFAULT_COMPENSATION_PERCENTAGE` (line 35), export `COMPENSATION_PERCENTAGE = 15` as the single source of truth
13. `localization/locales/{ar,en}/admin.json` — same purges as web (lines 1028, 1055)
14. `localization/locales/{ar,en}/plans.json` — purge per-bullet keys; add structural keys (taglines, duration, rows)

---

## 16. Implementation order (no parallel work — strict sequence to avoid mid-flight breakage)

1. **Backend constants** — `plans.js` (PLAN_CODES diff per §19; remove `FEATURE_LABELS`, `buildFeaturesArray`, `BUSINESS_SETUP_FEE`); `constants/index.js` (drop `BUSINESS_SETUP_FEE` re-export)
2. **Backend model** — `PlanModel.js` (slim `featuresSchema`, add `setupFeeAmount` + `featureBullets`)
3. **Backend defaults** — `planDefaults.js` full rewrite per §8; copy bullet strings from §4 verbatim
4. **Backend seed script** — `seedPlans.js`: upsert-by-code; update EXPECTED counts (`trial 1 / basic_event 10 / basic_monthly 10 / premium_event 10 / premium_monthly 10 / business_event 10 / business_quarterly 1 / business_annual 1 / unlimited 1` → total **54**)
5. **Backend service layer** — `subscriptions.service.js`, `plans.service.js` (`_formatPlan` contract per §17 below; drop `setupFeeRequired/Amount` wrapper), `dashboard.service.js`, `SubscriptionModel.createForUser` (compensation now uses constant); delete `SubscriptionModel.hasFeature()`
6. **Backend validation & docs** — `plans.schemas.js` (full rewrite per §11) + `swagger.js` (sync `Plan` / drop `featuresArray` / `BusinessPlansResponse`)
7. **Drop DB, re-seed** — pre-flight checklist §21 → `node scripts/seedPlans.js`
8. **Verify API** — `GET /plans`, `GET /plans/host`, `GET /plans/business` return new shape (no `featuresArray`, no `compensationPercentage`, with `featureBullets` and top-level `setupFeeAmount`)
9. **Web shared component** — build `<PlanDescription>` per §5
10. **Web pages** — landing (`PricingSection`), host plans (`usePlansPageState`, `PlanSummaryCard`), admin manage-plans (`EditPlanPopup`, delete `PlanFeatureTogglesSection`, new `PlanFeatureBulletsSection`, update `PlanFeatureNumericsSection`), admin plans page, whitelabel signup steps 5+6
11. **Web locale purge & additions** — 5 locale files per §13 / §15
12. **Mobile shared component** — `PlanDescription.js`
13. **Mobile screens** — `PlansScreen`, `WhitelabelPlansScreen`, `WhitelabelPlansSummaryScreen` (apply setup fee — see §10), `EditPlanModal`, delete `_components/featuresMap.js` and `_components/PlanFeatureRow.js`
14. **Mobile locale purge & additions** — `admin.json` + `plans.json`
15. **Email templates** — leave `data.features.map(...)` blocks; add a `// TODO` comment per §14 (no live callers)
16. **Smoke test all surfaces** — landing (3 cards), host plans page, admin manage-plans edit popup, whitelabel signup steps 5+6 (verify 1,200 SAR setup fee appears for event tiers; verify 0 for quarterly/annual), mobile host plans, mobile whitelabel checkout (verify setup fee now applied — pre-existing bug fix)

---

## 17. Risks / things to double-check at write time

### `_formatPlan()` API response contract (plans.service.js:374-397)

After rewrite, every consumer of `GET /plans/*` receives this shape (and **only** this shape):

```js
{
  id, code, name, nameAr, nameEn,
  description, descriptionAr, descriptionEn,
  planType, planFamily, billingType, availableFor,
  pricing: { oneTime },
  price,           // alias of pricing.oneTime
  currency,
  limits,          // { maxEvents, maxInvitesPerEvent, invitePool, durationDays, maxHosts }
  invites,         // event plans only
  invitePool,      // pool plans only
  compensationPool,// computed via COMPENSATION_PERCENTAGE constant
  features: { whatsAppTemplates },
  setupFeeAmount,  // NEW — number, 0 for non-business and time-based business plans
  featureBullets,  // NEW — { ar: String[], en: String[] }
  isActive, sortOrder,
}
```

**Dropped fields** (any frontend code reading these breaks):
- `compensationPercentage` (was on top-level)
- `featuresArray` (was the icon+label array built by `buildFeaturesArray`)

§20 enumerates every consumer that must migrate.

### Verifications to perform before commit

- **`req.subscription.features.*` consumers** — `src/shared/middleware/subscription.js:84` exposes the slimmed `features` object on requests. Grep already confirmed zero consumers read `has*` booleans, but re-grep after the rewrite to catch any added during implementation.
- **Trial plan + Unlimited plan bullets** — Trial: empty arrays + short `descriptionAr/En` per §18. Unlimited: empty arrays (never rendered). Both confirmed.
- **Sort orders** — recompute `sortOrder` so new tiers (25, 50, 75 for monthly variants; 350, 400 for all event variants; 25, 50, 75, 250, 350 for business event) sort numerically. Suggested formula: `sortOrder = invites` for event/monthly tiers, `1000`/`2000` for quarterly/annual respectively, `0` for trial, `9999` for unlimited.
- **Frontend tier dropdown population** — host `PlansScreen.js` and web `PricingSection.jsx` both build tier lists from API response; explore confirmed no hardcoded tier arrays. New tiers (25/50/75 monthly; 350/400 event) should appear automatically.
- **`pricing.oneTime` SAR validator** — new prices in §3 all integer SAR amounts, pass the 2-decimal validator. No floats introduced.
- **Quarterly price fix 3,500 → 3,000** — already in §8; double-check no other place hardcodes 3,500 (grep `3500` in plans-related files before commit).

---

## 18. Sign-off status — ALL APPROVED

| # | Item | Status |
|---|---|---|
| 1 | Pricing for new tiers (§3 table) | **APPROVED** |
| 2 | Quarterly fix 3,500 → 3,000 SAR | **APPROVED** |
| 3 | Taglines — verbatim from doc (§5) | **APPROVED** |
| 4 | Trial / Unlimited handling | **APPROVED** (see below) |

### Trial / Unlimited — final handling

Both plans stay in the DB. **No bullets**, just short descriptions:

- **`trial`** — auto-assigned to hosts on signup.
  - `descriptionAr`: `الباقة التجريبية المجانية — مناسبة واحدة بعدد ٥ مدعوين لمدة ٩٠ يومًا`
  - `descriptionEn`: `Free trial plan — one event with 5 guests, valid for 90 days`
  - `featureBullets`: `{ ar: [], en: [] }`

- **`unlimited`** — admin-only, never displayed in UI.
  - `descriptionAr`: `باقة المسؤولين — وصول كامل بدون حدود`
  - `descriptionEn`: `Admin plan — full unlimited access`
  - `featureBullets`: `{ ar: [], en: [] }`

`<PlanDescription>` renders the tagline + bullets section; if `featureBullets[lang]` is empty, the bullets list is skipped entirely. For the trial plan, post-signup widgets fall back to the short `descriptionAr/En` text. For unlimited, nothing renders publicly anyway.

---

---

## 19. `PLAN_CODES` enum diff (`src/shared/constants/plans.js:26-48`)

**Remove (1):**
```
BUSINESS_EVENT_500: 'business_event_500'
```

**Add (19):**
```js
BASIC_EVENT_350:     'basic_event_350',
BASIC_EVENT_400:     'basic_event_400',
BASIC_MONTHLY_25:    'basic_monthly_25',
BASIC_MONTHLY_50:    'basic_monthly_50',
BASIC_MONTHLY_75:    'basic_monthly_75',
BASIC_MONTHLY_350:   'basic_monthly_350',
BASIC_MONTHLY_400:   'basic_monthly_400',
PREMIUM_EVENT_350:   'premium_event_350',
PREMIUM_EVENT_400:   'premium_event_400',
PREMIUM_MONTHLY_25:  'premium_monthly_25',
PREMIUM_MONTHLY_50:  'premium_monthly_50',
PREMIUM_MONTHLY_75:  'premium_monthly_75',
PREMIUM_MONTHLY_350: 'premium_monthly_350',
PREMIUM_MONTHLY_400: 'premium_monthly_400',
BUSINESS_EVENT_25:   'business_event_25',
BUSINESS_EVENT_50:   'business_event_50',
BUSINESS_EVENT_75:   'business_event_75',
BUSINESS_EVENT_250:  'business_event_250',
BUSINESS_EVENT_350:  'business_event_350',
```

**Count check (before → after):**

| Group | Before | After | Δ |
|---|---:|---:|---:|
| Basic event (25–400)       | 8 | 10 | +2 (350, 400) |
| Basic monthly (25–400)     | 5 | 10 | +5 (25, 50, 75, 350, 400) |
| Premium event (25–400)     | 8 | 10 | +2 (350, 400) |
| Premium monthly (25–400)   | 5 | 10 | +5 (25, 50, 75, 350, 400) |
| Business event (25–400)    | 6 | 10 | +5 added (25, 50, 75, 250, 350), −1 removed (500) |
| Trial / Quarterly / Annual / Unlimited | 4 | 4 | 0 |
| **TOTAL `PLAN_CODES` entries** | **36** | **54** | **+19 / −1** |

**Order in the file:** group by family/billing-type, sorted ascending by tier number, to
match the visual order in `planDefaults.js`.

---

## 20. `featuresArray` consumer migration table

`_formatPlan` no longer returns `featuresArray`. Every reader must switch to
`featureBullets[lang]` (via `<PlanDescription>`) or be deleted outright.

| File | Lines | Action |
|---|---|---|
| `labbe/ui/landing/PricingSection/PricingSection.jsx` | 317, 358, 403, 444, 486, 520, 555 | Replace `<FeatureList features=...featuresArray />` with `<PlanDescription plan=... lang=lang selectedInviteCount=... />` |
| `labbe/app/[lang]/host/plans/_hooks/usePlansPageState.js` | 86, 93 | Stop returning `featuresArray`; expose `featureBullets` instead |
| `labbe/app/[lang]/admin-dash/plans/page.js` | 22, 88 | Stop reading `featuresArray`; render via `<PlanDescription>` |
| `labbe/ui/auth/signup/whiteLabel/stepFive/StepFive.js` | 18, 85 | Stop reading `featuresArray`; render via `<PlanDescription>` |
| `halla-mobile/screens/host/PlansScreen.js` | 95, 102 | Render via mobile `PlanDescription` |
| `halla-mobile/components/plans/HostPlanCard.js` | 37 | Drop `featuresArray` prop path; render via `PlanDescription` |
| `halla-mobile/components/plans/BusinessPlanCard.js` | 64-66 | Drop `featuresArray` block; render via `PlanDescription` |
| `halla-mobile/components/plans/_components/PlanFeatureRow.js` | whole file | **DELETE** |
| `halla-mobile/components/plans/_components/featuresMap.js` | whole file | **DELETE** |
| `labbe-backend-/src/config/swagger.js` | `Plan` schema | Remove `featuresArray` property definition |

(`docs/modules/plans-fullstack-review-plan.md:388` is a historical planning doc — leave it.)

---

## 21. Pre-flight sanity checklist (run before `node scripts/seedPlans.js`)

Run these greps from the repo root after finishing §16 step 6 and before step 7. All
must return **zero hits** (or only matches inside `docs/`, `plans/`, `*.docx`, `plans.txt`).

```bash
# 1. Removed constants must be gone from runtime code
grep -rn "BUSINESS_SETUP_FEE\|FEATURE_LABELS\|buildFeaturesArray\|hasFeature(" labbe-backend-/src labbe-backend-/models labbe-backend-/scripts labbe-backend-/email

# 2. Removed boolean features must be gone from runtime code
grep -rn "hasCompensationInvites\|compensationPercentage\|hasInAppInvites\|hasWhatsAppInvites\|hasSMSInvites\|hasQRCode\|hasQRScanning\|hasFlexibleEntryMode\|hasStaffCheckIn\|hasStaffAssignment\|hasRSVPTracking\|hasAutoReminders\|hasEmailNotifications\|hasCustomWhatsAppNumber\|hasOfficialSenderNumber\|hasCustomWebPage\|hasMessageTracking\|hasBasicTemplates\|hasPremiumTemplates\|hasPostEventPage\|hasCustomReports\|hasWhatsAppSupport\|priorityPoints" labbe-backend-/src labbe-backend-/models labbe-backend-/scripts

# 3. featuresArray must be gone from frontend code
grep -rn "featuresArray" labbe/app labbe/ui labbe/utils halla-mobile/components halla-mobile/screens halla-mobile/utils labbe-backend-/src/modules

# 4. setupFeeRequired wrapper must be gone
grep -rn "setupFeeRequired" labbe labbe-backend- halla-mobile

# 5. DEFAULT_COMPENSATION_PERCENTAGE removed
grep -rn "DEFAULT_COMPENSATION_PERCENTAGE" halla-mobile labbe

# 6. PLAN_CODES.BUSINESS_EVENT_500 gone
grep -rn "BUSINESS_EVENT_500\|business_event_500" labbe-backend-/src labbe-backend-/scripts

# 7. Quarterly price 3,500 gone
grep -rn "3500\b" labbe-backend-/src/shared/constants/planDefaults.js
```

Then connect to the dev DB and confirm `db.plans.countDocuments()` is `0` (or run
`Plan.deleteMany({})` first if the seed script's upsert can't otherwise drop the old
shape). Then `node scripts/seedPlans.js` and confirm:
- `✅ All counts correct!` line is printed
- `db.plans.distinct("code").length === 54`
- `db.plans.findOne({code:'business_event_100'}).setupFeeAmount === 1200`
- `db.plans.findOne({code:'business_quarterly'}).setupFeeAmount === 0`
- `db.plans.findOne({code:'business_quarterly'}).pricing.oneTime === 3000` (was 3500)
- `db.plans.findOne({code:'basic_event_100'}).featureBullets.ar.length === 14`
- `db.plans.findOne({code:'basic_monthly_100'}).featureBullets.ar.length === 14` (bullet 1 differs)
- `db.plans.findOne({code:'premium_event_100'}).featureBullets.ar.length === 6`
- `db.plans.findOne({code:'business_quarterly'}).featureBullets.ar.length === 8`
- `db.plans.findOne({code:'trial'}).featureBullets.ar.length === 0`
- `db.plans.findOne({code:'business_event_500'}) === null` (removed)

---

## Ready to start

All four sign-off items approved + rev. 2 review fixes applied. Starting with §16
step 1 (backend constants) on confirmation.
