# Template cards refresh — plan

Goal: re-seed our template cards so the fields, overlay positions and decorations match the **polished reference designs** in `D:/halla/labbe/public/template-cards/` (numbered `1.png` – `16.png`, plus `14.jpg`). At the same time, **unify field naming** so that the same logical input always uses the same key / label / placeholder across every card.

The two seed scripts being rewritten:

- `labbe-backend-/scripts/seedTemplateCards.js` (wave 1, currently 6 templates)
- `labbe-backend-/scripts/seedTemplateCardsWave2.js` (wave 2, currently 14 templates)

The script that previously normalized DB documents — `labbe-backend-/scripts/unifyTemplateInputs.js` + `UNIFY_TEMPLATE_INPUTS_SUMMARY.md` — already encodes most of the shared vocabulary; we will reuse that vocabulary as the **source of truth** instead of re-deriving it.

---

## 1. Polished card → source image mapping (proposed)

The polished mockups in `D:/halla/labbe/public/template-cards/` show what the card should *look like once a host has filled it in*. Each maps to one of the raw backgrounds in `D:/halla/template-cards/`. **Confirm this mapping before we start writing code** — three rows are guesses and the rest are visually obvious.

| # | Polished file | Source background (`D:/halla/template-cards/`) | Category | Working name |
|---|---|---|---|---|
| 1  | `1.png`  | `marriage.jpg` (dark groom, calligraphy backdrop) | wedding   | Royal Groom (Dark) |
| 2  | `2.png`  | `wedding_white_dawah.jpg` (white frame, navy دعوة badge) | wedding | Pearl Da'wah Wedding |
| 3  | `3.png`  | `wedding_navy_dawah.jpg` (navy frame, white دعوة badge) | wedding | Royal Da'wah Wedding |
| 4  | `4.png`  | `wedding_gulf_groom.jpg` (white background, gulf groom photo + gold hem) | wedding | Gulf Groom |
| 5  | `5.png`  | `blessed_births.jpg` *(repurposed as wedding — pink floral corners)* — **CONFIRM** | wedding | Rose Garden Wedding |
| 6  | `6.png`  | `woman_invitation.jpg` (burgundy florals at bottom on cream) | wedding | Burgundy Bloom Wedding |
| 7  | `7.png`  | `marriage2.jpg` (pink floral arch with dome) | wedding | Floral Arch Wedding |
| 8  | `8.png`  | `engament.jpg` (light cream, white florals at bottom) | engagement | Candle Engagement |
| 9  | `9.png`  | `marriage_contract_arch.jpg` *(arch + floral corners — visual fit is loose)* — **CONFIRM** | wedding | Sacred Vows |
| 10 | `10.png` | `general_spring.jpg` (sky blue, sheep + cosmos) | general_event | Eid Al-Adha |
| 11 | `11.png` | `general_lantern.jpg` (cream, hanging lanterns + crescent) | general_event | Ramadan Iftar |
| 12 | `12.png` | `birthday.jpg` (pink/blue bunting + gifts) | birthday | Birthday Party |
| 13 | `13.png` | `newborn_boy.jpg` (cream + blue florals + crib) | baby_shower | Newborn Boy |
| 14 | `14.jpg` | `newborn_girl.jpg` (pink, carousel) | baby_shower | Newborn Girl |
| 15 | `15.png` | `marriage_contract_bronze.jpg` *(repurposed — chandelier + red roses)* — **CONFIRM** | general_event | Graduation Celebration |
| 16 | `16.png` | `engagement_pearl.jpg` (pearl/cream florals) | engagement | Pearl Promise |

### Source files that are NOT in the polished set

These have no polished reference; we have two options — pick one per file:

- `marriage_contract_arch.jpg` — used above as #9 ✓
- `general_pilgrimage.jpg` — Kaaba photo, no polished mockup → **drop or design later**
- `conference.jpg` — Saudi man + bokeh, no polished mockup → **drop or design later**
- `wedding_navy_frame.jpg`, `wedding_white_frame.jpg` — empty frames, the Da'wah variants in #2/#3 cover the same audience → **drop**

**Decision needed:** ship only 16 polished templates and soft-delete/skip the others? My recommendation: yes — soft-delete the previously-seeded Royal Navy / Pearl Frame / Sacred Pilgrimage / Visionary Conference rows, since they don't have a polished reference yet.

---

## 2. Unified input vocabulary

Single canonical key set used across every template. Already locked by `unifyTemplateInputs.js` — promoting it from "DB rename" to "seed source of truth".

### 2.1 Shared content keys

| key | type | English label | Arabic label | English placeholder | Arabic placeholder | Limits |
|---|---|---|---|---|---|---|
| `invitationHeader` | text | Header | العنوان | e.g. "دعوة" | مثل "دعوة" | default `"دعوة"` |
| `invitationMessage` | textarea | Invitation Message | رسالة الدعوة | — | — | rows: 3, maxLength: 240 |
| `groomName` | text | Groom | العريس | e.g. Khalid Al-Saud | مثل خالد آل سعود | required (when used) |
| `brideName` | text | Bride | العروس | e.g. Sara Al-Qahtani | مثل سارة القحطاني | required (when used) |
| `brideFatherName` | text | Bride's Father | والد العروسة | optional | اختياري | — |
| `hostessName` | text | Hostess | المضيفة | e.g. Um Sara | مثل أم سارة | — |
| `hostName` | text | Host | المضيف | optional | اختياري | — |
| `eventTitle` | text | Event Title | عنوان المناسبة | e.g. Eid Gathering | مثل تجمع العيد | — |
| `eventDate` | date | Date | التاريخ | — | — | required (when used) |
| `eventTime` | time | Time | الوقت | — | — | required, defaults per card |
| `venue` | text | Venue | المكان | e.g. Riyadh, Hilton Hall | مثل الرياض، قاعة هيلتون | maxLength: 80 |
| `celebrantName` | text | Celebrant | صاحب المناسبة | — | — | — |
| `age` | number | Age | العمر | — | — | min: 1, max: 120 |
| `babyName` | text | Baby Name | اسم المولود | — | — | — |
| `parents` | text | Parents | الوالدان | e.g. Ahmad & Reem | مثل أحمد وريم | required |
| `birthDate` | date | Birth Date | تاريخ الولادة | — | — | — |
| `weight` | number | Weight (kg) | الوزن (كجم) | — | — | min: 0.5, max: 10, step: 0.01 |
| `announcement` | text | Announcement | البشارة | — | — | per-card default |
| `openingVerse` | text | Opening Verse | الآية | — | — | per-card default |

### 2.2 Style keys (always present, always last in the form)

| key | type | label EN | label AR |
|---|---|---|---|
| `primaryColor` | color | Primary Colour | اللون الأساسي |
| `fontFamily` | font | Font | الخط |

### 2.3 Default `invitationMessage` per category

(Host can still edit. These come from `UNIFY_TEMPLATE_INPUTS_SUMMARY.md` §"Per-category default".)

- wedding → `"يتشرف بدعوتكم لحضور حفل زفافه"`
- engagement → `"يتشرفان بدعوتكم لحضور حفل خطوبتهما"`
- birthday → `"يسعدنا حضوركم لمشاركتنا الفرحة"`
- baby_shower → `"أهلاً وسهلاً بضيف الحياة الجديد"`
- general_event → `"يسعدنا حضوركم في هذه المناسبة"`

### 2.4 What we are *not* keeping

Drop these orphan/duplicate keys from the existing seed scripts (they have no overlay or duplicate another key):

`weddingDate`, `weddingTime`, `partyDate`, `partyTime`, `engagementDate`, `engagementTime`, `guestMessage`, `conferenceTitle`, `hisName`, `herName`, `groomFamilyName`, `brideFamilyName`, `address`, `rsvpDate`, `hashtag`, `theme`, `dressCode`, `pilgrimName`, `organizerName`, `keynoteSpeaker`, `registrationUrl`.

(`brideFatherName`, `openingVerse`, `announcement`, `invitationHeader`, `hostessName`, `hostName` are kept because they each appear in a polished card.)

---

## 3. Per-card field set (what each polished design needs)

Read this together with the polished images. Each row lists the **content fields** the design displays — every one of these gets a matching overlay positioned per the design. Every card also gets `primaryColor` + `fontFamily` (style-only, no overlay).

| # | Polished | Visible content fields (in render order, top→bottom) |
|---|---|---|
| 1 | Royal Groom (Dark) | `invitationHeader`, `invitationMessage`, `groomName`, `eventTime`, `venue`, `eventDate` |
| 2 | Pearl Da'wah | `invitationHeader`, `openingVerse`, `invitationMessage`, `groomName`, `brideFatherName`, `eventDate`, `eventTime`, `venue` |
| 3 | Royal Da'wah | (same field set as #2) |
| 4 | Gulf Groom | `invitationMessage`, `eventDate`, `venue`, `hostName`, `groomName` |
| 5 | Rose Garden Wedding | `invitationHeader`, `invitationMessage`, `groomName`, `brideName`, `eventDate`, `eventTime`, `venue` |
| 6 | Burgundy Bloom Wedding | `invitationHeader`, `openingVerse`, `invitationMessage`, `groomName`, `brideName`, `eventDate`, `eventTime`, `venue` |
| 7 | Floral Arch Wedding | `invitationHeader`, `invitationMessage`, `groomName`, `brideName`, `eventDate`, `eventTime`, `venue` |
| 8 | Candle Engagement | `openingVerse`, `invitationMessage`, `groomName`, `brideName`, `eventDate`, `eventTime`, `venue` |
| 9 | Sacred Vows | `openingVerse`, `groomName`, `brideName`, `brideFatherName`, `eventDate`, `eventTime`, `venue` |
| 10 | Eid Al-Adha | `eventTitle` (= "عيد الأضحى"), `invitationMessage`, `eventDate`, `eventTime`, `venue` |
| 11 | Ramadan Iftar | `eventTitle` (= "سفرة إفطار رمضان"), `invitationMessage`, `eventTime`, `venue` |
| 12 | Birthday Party | `invitationMessage`, `celebrantName`, `eventDate`, `eventTime`, `venue` |
| 13 | Newborn Boy | `announcement` (= "baby"), `invitationMessage`, `babyName`, `parents`, `birthDate` |
| 14 | Newborn Girl | `invitationMessage`, `babyName`, `parents`, `birthDate` |
| 15 | Graduation | `invitationMessage`, `celebrantName`, `eventDate`, `eventTime`, `venue` |
| 16 | Pearl Promise | `invitationHeader`, `invitationMessage`, `groomName`, `brideName` |

**Build rule:** for every key in this row, emit one `field` AND one `overlay`. No form-only fields, no orphan overlays — both seed scripts already assert this (`seedTemplateCardsWave2.js:565`); we extend the same assertion to wave 1.

---

## 4. Overlay positions

**Step 0 — verify aspect ratios first.** The polished PNG and the source JPG must have the **same width/height ratio**. If they don't, percent positions measured on the polished mockup land in the wrong spot once the editor draws them over the source background. Add a sharp-based ratio check at the top of the seed run; if any pair mismatches, either re-export the polished PNG at the source's aspect ratio or re-crop the source.

For each polished card, the overlay `topPct` / `leftPct` / `widthPct` / `fontSizeVh` / `fontWeight` must be re-measured **from the polished mockup**, not from the raw background. Most existing overlay numbers in the two seed scripts are now stale.

Workflow per card (we'll do this once when implementing):

1. Open the polished PNG in an image viewer that shows pixel position on hover.
2. For each visible text block, read the centre as a percentage of image height/width → fill into `ov(...)`.
3. Estimate font size as a fraction of image height → `fontSizeVh`.
4. For dark backgrounds (#1, #3, parts of #6), keep the `colorBinding: "custom"` + hardcoded hex pattern from the existing seed (`seedTemplateCards.js:99`). On light backgrounds use `colorBinding: "primary"` so the host's accent colour drives the text colour.

I will not enumerate every coordinate in this plan — that's hundreds of numbers and they belong in the script. The plan locks the **field set** (§3) and the **vocabulary** (§2); positions get re-measured during implementation.

---

## 5. Decorations

Each polished card already has its decorative iconography baked into the **image itself** (lanterns in #11, gifts in #12, crib in #13, etc.). That means most cards should end up with **zero or very few decoration entries**, and definitely none that overlap with art already in the source PNG.

Action: strip the existing `decorations: [...]` array down to:

- Where the polished design clearly has an icon overlaid that ISN'T in the background art (e.g. the clock / pin / calendar trio in #1, #2, #3, #5, #7, #10, #11, #12, #15) → keep a small icon row using `Clock`, `MapPin`, `CalendarDays` from lucide.
- Everywhere else → empty.

**Verify before seeding** that these icons are NOT already drawn into the source JPG. If the polished mockup shows a clock and so does the source background, our overlay will double the icon. Check each card individually.

The Clock/MapPin/Calendar trio is a recurring motif across at least 8 cards; it should be a helper:

```js
const metaRow = (color, topPct, opts = {}) => [
  dec("Clock",        color, topPct, 30, 4, 2.6),
  dec("MapPin",       color, topPct, 50, 4, 2.6),
  dec("CalendarDays", color, topPct, 70, 4, 2.6),
];
```

---

## 6. Execution plan

### 6.1 Files to change

1. `seedTemplateCards.js` — rewrite `TEMPLATES` and `CATEGORIES` from §1/§2/§3.
2. `seedTemplateCardsWave2.js` — rewrite `TEMPLATES` from §1/§2/§3; consider folding both into a single script since the wave-1 vs wave-2 split no longer maps to anything meaningful.
3. (Optional) Extract the field-vocabulary into a small module — `scripts/_templateCardVocab.js` — so the labels/placeholders/limits live in **one** place and every template spec references it. This is the structural fix that prevents future drift.
4. `seedTemplateCards.js` cleanup list (`JUNK_TEMPLATE_NAMES`) gets extended with the existing template names that no longer have a polished design (Royal Navy Wedding, Pearl Frame Wedding, Sacred Pilgrimage, Visionary Conference, plus the original "Royal Wedding"/"Garden Wedding"/"Pure Promise" etc. whose specs we're replacing).

### 6.2 DB strategy — re-seed vs mutate

Two options:

**A. Wipe + reseed (recommended).** Soft-delete every existing template whose `nameEn` is in the previous spec, then create the 16 new ones from the polished mockups. Idempotent re-run support already exists (`seedTemplateCards.js:374`). Clean, no half-renamed rows.

**B. Mutate in place.** Re-run `unifyTemplateInputs.js`, then patch overlay positions. Preserves any host-side data that referenced the old template `_id`s. Riskier because we'd need a second `updateTemplateOverlays` pass.

We have no host-facing data referencing these templates yet (no events were built on them) → go with **A**.

### 6.3 Rollout order

1. Land §1 mapping in this doc + user sign-off (one judgment call on row 5, 15 + "drop" decisions for the 4 unused source images).
2. Add the shared vocab module (§6.1 step 3).
3. Rewrite the two seed scripts using the vocab module and the §3 field lists.
4. Re-measure overlay positions from each polished PNG and fill them in.
5. `node scripts/seedTemplateCards.js --dry-run` against local DB → review the print-out → run for real.
6. `node scripts/seedTemplateCardsWave2.js --dry-run` (same).
7. Spot-check on the labbe admin UI: every polished card has its template, fields render in form order, overlays sit where the mockup shows them.
8. Run against staging DB.

### 6.4 Risks

- **Stale S3 keys.** Re-running creates fresh S3 uploads for every replaced template; the old ones become orphans. Run `scripts/gcOrphanTemplateImages.js` afterward (already exists).
- **Position drift between mockup and background.** The polished PNGs are renders of the *background + text*, but the editor only stores the background. If a mockup positions text relative to art that isn't perfectly centered in the background (e.g. asymmetric floral corners), overlays might look slightly off. Mitigation: measure relative to the background image dimensions, not the mockup's text, and spot-check in the editor.
- **Arabic text reflow.** A field with `maxLength: 240` and `rows: 3` may render on 2 lines in some fonts and 4 in others. Pick the overlay's vertical centre on the mockup's longest realistic line, not the visible mockup line.

---

## 7. Open questions (need user sign-off before coding)

0. **🚩 Calligraphy names — biggest decision.** Several polished cards show couple names as **bespoke joined-letter calligraphy**:
   - `5.png` "حسنان" (joined), `6.png` "محمد حليمة" (interlocked), `7.png` "نبيل مسرة" (interlocked), `9.png` "ماجدة", `15.png` "بيان" (with graduation cap fused into the letterform), `16.png` "فهد & هلا" + "HALA | FAHAD"

   The editor renders text in a chosen `fontFamily` at a `fontSize`. **It cannot reproduce joined-letter calligraphy from a host-typed name.** Pick one approach per card:

   - **(A) Bake the names into the background.** The card stops being a "template" and becomes hardcoded to one couple. No `groomName` / `brideName` overlay; remove the field.
   - **(B) Render names as plain Amiri/Reem-Kufi text.** Editable, but the polished mockup's calligraphic feel is lost.
   - **(C) Drop these specific cards from the seed for now** and revisit when we have a calligraphy renderer (out of scope today).

   §3 currently assumes path **B** silently for all of them. Please confirm A/B/C per card before we measure overlays — the choice changes which fields each card has.

1. **Mapping rows 5, 9 and 15 are guesses** — `5.png` ↔ `blessed_births.jpg`?, `9.png` ↔ `marriage_contract_arch.jpg`?, `15.png` ↔ `marriage_contract_bronze.jpg`? Please confirm or correct.
2. **Drop unused sources?** OK to soft-delete the existing Royal Navy / Pearl Frame / Sacred Pilgrimage / Visionary Conference templates and skip the matching source images for now?
3. **Single script or two?** The wave-1/wave-2 split has no remaining meaning. Merge into one `seedTemplateCards.js`?
4. **Categories.** Do we still want all 7 (`wedding`, `engagement`, `birthday`, `baby_shower`, `ladies_event`, `general_event`, `conference`), or drop `ladies_event` (no polished card) and `conference` (no polished card)?
5. **Wave-1 Royal/Garden/Pure Promise/Sweet Celebration/Blessed Newborn/Ladies' Gathering** — these templates exist today from `seedTemplateCards.js`. They're being replaced by the polished set. Soft-delete them as part of the re-seed?
