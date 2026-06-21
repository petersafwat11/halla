# Template-Card Precision Audit — Phase 1 Proposal (analysis only)

**Scope:** read-only analysis + proposal. No application code, seed, DB, or S3
was modified. The only writes are analysis artifacts under
`plans/template-audit/` (`measure.js`, `zoom.js`, `db_inspect.js`, and the
generated images in `out/`).

**Evidence base (not old comments/plans):** the 16 completed references
(`labbe/public/template-cards/{1..16}`), the 20 current source JPGs
(`template-cards/*.jpg`), the live DB (read-only), and the real renderer
(`OverlayItem.jsx`, `TemplatePreviewCanvas.jsx`, `TemplateModel.js`,
`templates.service.js`, `useTemplateBake.js`).

---

## Findings summary

1. **All 20 sources and all 16 references are exactly 4500 × 8000 px (9:16,
   ratio 0.5625).** The aspect-ratio check passes for every pair at 0.0%
   difference — overlay percentages measured on a reference land at the same
   percentage on its source. (`bake_calligraphy.js` resized every source to
   4500×8000 with `fit:'fill'`, which is why they all match.)

2. **The live DB does not match the current seed.** `seedTemplateCards.js` has
   **not** been applied. The 20 live templates are the *pre-refresh* legacy
   rows with inconsistent, non-canonical keys (`groomFamilyName`,
   `brideFamilyName`, `weddingDate`, `weddingTime`, `partyDate`, `partyTime`,
   `engagementDate`, `engagementTime`, `hisName`, `herName`, `guestMessage`,
   `hostessName`, `pilgrimName`, `conferenceTitle`, `organizerName`,
   `keynoteSpeaker`, `registrationUrl`, …). Target id `69fb550534860e1f4dc8c96a`
   = **"Visionary Conference"** (`conference.jpg`, v0). **Any event already
   created stores these legacy keys** — see §E for the breaking-change map.

3. **The seed has three concrete, confirmed defects** (the plan's suspicions are
   correct):
   - **Card #1** creates an `invitationHeader` overlay over the **baked** `دعوة`
     calligraphy → it would render twice. Confirmed: `دعوة` is present in the
     `marriage.jpg` source itself.
   - **`_templateCardVocab.js:64-65`** ships the forbidden surname
     ("Khalid **Al-Saud**" / "خالد **آل سعود**") as the `groomName` placeholder.
   - **`metaRow`** emits the columns in visual order **Time, Venue, Date** (icon
     pairing is internally correct, but the order violates the required
     semantic standard **Date, Time, Venue**).

4. **The bake-script job list is *not* ground truth** (as the plan warned).
   Verified per-image: e.g. `bake_calligraphy.js` claims `دعوة` was baked into
   `blessed_births.jpg` (#5) at 26-38%, but neither the source nor the reference
   shows a `دعوة` there — #5 is a floral wedding with message + name only. All
   baked/dynamic calls below come from pixel comparison, not the script.

5. **The seed mis-models the name cards** (verified per-card by native-resolution
   zoom). **Single name:** #1/#2/#3/#4 (da'wah/groom), **#5** ("حسان"),
   **#7** ("بسمة"), **#9** ("ماجد", عقد قران). **Couple (two names):**
   **#6** ("محمد"+"حليمة", stacked in ref → placed side by side per rule 4),
   **#8**, **#16** ("فهد & هلا"). The seed used a blanket couple set for
   #5/#6/#7 and single for others — corrected per card. (Cultural norm: a
   زفاف/men's reception features the groom; engagements name both.)

6. **Renderer gap — multiline.** Overlays have no line-height, `white-space`,
   max-height, or clipping control (confirmed in `OverlayItem.jsx`,
   `TemplateModel.js`, `templateSchema.js`). `invitationMessage` wraps only by
   `widthPct`; you cannot pin line spacing or guarantee it stays inside a box.
   This is an implementation gap, not something to fake with coordinates (§A).

7. **A measurement tool was built** (`plans/template-audit/measure.js`):
   reference − source pixel diff → threshold → dilation → connected-components →
   bounding boxes → **computed** centre `topPct`/`leftPct`/`widthPct` + sampled
   text colour. This is the non-DB visual-verification method the plan asks for
   (§A, item 12); the forward "render proposed overlays onto source" half is
   specified for the implementation phase.

---

## A. Current architecture and blockers

### A.1 Coordinate / rendering contract (measured from code)

| Property | Behaviour | Source |
|---|---|---|
| Position origin | `OverlayItem` sets `left=leftPct%·W`, `top=topPct%·H`, then `transform: translate(-50%,-50%)`. **`topPct`/`leftPct` are CENTRE coordinates**, not top-left. | `OverlayItem.jsx:28-50` |
| Units | `W`/`H` are the rendered image's pixel size; percentages are of the **natural** image (4500×8000), so they are resolution-independent across thumb/preview/bake. | `OverlayItem.jsx`, `TemplatePreviewCanvas.jsx:63-79` |
| Font size | `fontSize = fontSizeVh/100 · containerHeight`. **`fontSizeVh` is a % of image HEIGHT** (a "vh" relative to the card, not the viewport). | `OverlayItem.jsx:31-35` |
| Icon size | decorations use `iconSizeVh` the same way; `renderIconByName(source,{size})`. | `OverlayItem.jsx:62-64` |
| Colour | `colorBinding:"custom"` → `overlay.color`; else `colorOverride || primaryColor || "#5a4a42"`. Dark backgrounds must use `custom` so the host's `primaryColor` can't render invisibly. | `OverlayItem.jsx:37-41` |
| Alignment | `textAlign` (default `center`); RTL handled by browser bidi on Arabic glyphs. | `OverlayItem.jsx:51` |
| Empty preview | empty value falls back to **`field.labelEn`** — so an empty Arabic preview shows English. Validate Arabic fit with real Arabic sample values. | `TemplatePreviewCanvas.jsx:145` |
| Date format | `formatTemplateDate(raw,t)`; `time` collapses to 24h `HH:MM`. | `TemplatePreviewCanvas.jsx:28-52` |
| Z-order | decorations then overlays, each sorted by `zIndex` asc. | `TemplatePreviewCanvas.jsx:92-93` |
| Final bake | host Step-3 renders the **same** `TemplatePreviewCanvas` DOM, then `html-to-image` screenshots it (`bakeTemplateImage`). **Admin preview and baked output are WYSIWYG-identical** (modulo web-font load + container width). | `useTemplateBake.js:75-93` |
| `naturalWidth/Height` | derived by `sharp().metadata()` on the uploaded source at create time → 4500×8000 for all. | `templates.service.js:117-160` |
| Versioning | `updateTemplate` uses optimistic `expectedVersion`; mismatch → 409. New rows start `version:0`. | `templates.service.js:254-269` |

### A.2 Blockers / limitations that cap fidelity

1. **No multiline control (primary blocker).** `overlaySchema` has no
   `lineHeight`, `whiteSpace`, `maxHeight`, or overflow field. Multi-line copy
   (`invitationMessage`, multi-line verses) wraps by width only; line spacing is
   the browser default and box height is unconstrained, so long Arabic can
   overflow into the name/metadata bands. **Recommended implementation-phase
   additions:** `lineHeight` (unitless) and `maxLength` enforcement tied to the
   measured box. Until then, `invitationMessage` `maxLength` must be chosen
   conservatively from the available band (per-card below).
2. **Icon+value are two independent overlays/decorations,** not a grouped unit.
   The "icon above value" column is achieved by placing an icon decoration and a
   value overlay at the same `leftPct`, with the icon `topPct` ≈ value `topPct` −
   ~4. There is no flex group; spacing is manual.
3. **Colour binding is per-overlay.** On dark cards every text overlay needs
   `colorBinding:"custom"` or the host's accent can disappear. Sampled hexes are
   provided per card.
4. **No baked-text suppression.** If artwork is baked into the source, the only
   way to avoid double-render is to **not** create an overlay for it (we do not
   have a clean "remove baked text" pipeline; `bake_calligraphy.js` only *adds*).
5. **Arabic fallback to `labelEn`** means an unfilled required field previews in
   English — fine for admin, but screenshots taken before filling will look
   wrong. Not a data bug; note for QA.

### A.3 Event-side storage (confirmed for §E)

A host's Step-3 submission is stored on the event as
`visualTemplate = { templateRef→Template, fieldValues:{[fieldKey]:value},
bakedImagePath, isCustomUpload }` (`EventModel.js:116-135`). The invitation is
**baked once** (html2canvas web / react-native-view-shot mobile) into
`bakedImagePath`; `fieldValues` is the editable backing map. Renaming a
template's field keys therefore cannot change an already-baked invitation — only
a later re-edit re-reads `fieldValues`. (Quantified in §E.1.)

### A.4 What was NOT inspected (on the record, per plan)

The admin UI (`/ar/admin-dash/templates/…`) and host Step-3 were **not** browsed:
no dev server was assumed running and the plan permits skipping if access is
blocked. Instead the **live DB was read directly** (read-only) — stronger
evidence than the rendered UI for current field/overlay state. The renderer was
verified by reading its source, not by screenshot.

---

## B. Canonical vocabulary

One key per concept, identical definition everywhere it appears. Placeholders
carry examples; **no `defaultValue` on any editable field** (style fields carry a
visual default only). **Forbidden surname removed** — placeholders use bare
first names to avoid any tribal/family-name issue.

### B.1 Canonical field table

| key | type | labelEn / labelAr | placeholderEn / placeholderAr | req policy | rows | maxLen / bounds | overlay? |
|---|---|---|---|---|---|---|---|
| `invitationMessage` | textarea | Invitation Message / رسالة الدعوة | "We are honoured to invite you…" / "يتشرف بدعوتكم لحضور…" | optional | 3 | 240 (per-card may lower) | yes |
| `openingVerse` | text | Opening Verse / آية أو دعاء | "A short verse or blessing" / "آية قرآنية أو دعاء قصير" | optional | – | 120 | yes |
| `eventNote` | text | Event Note / كلمة المناسبة | "A short line, e.g. greetings" / "عبارة قصيرة، مثل تهنئة" | optional | – | 80 | yes |
| `closingMessage` | text | Closing Message / كلمة ختامية | "Closing line under the details" / "عبارة ختامية أسفل التفاصيل" | optional | – | 80 | yes |
| `groomName` | text | Groom / العريس | "e.g. Khalid" / "مثل: خالد" | required when used | – | 40 | yes |
| `brideName` | text | Bride / العروس | "e.g. Sara" / "مثل: سارة" | required when used | – | 40 | yes |
| `hostName` | text | Host / المضيف | "e.g. Abu Mohammed" / "مثل: أبو محمد" | optional | – | 60 | yes |
| `celebrantName` | text | Name / اسم صاحب المناسبة | "e.g. Layan" / "مثل: ليان" | required when used | – | 40 | yes |
| `babyName` | text | Baby Name / اسم المولود | "e.g. Hossam" / "مثل: حسام" | required when used | – | 30 | yes |
| `parentsNames` | text | Parents / الوالدان | "e.g. Ahmad & Reem" / "مثل: أحمد وريم" | optional | – | 60 | yes |
| `eventTitle` | text | Event Title / عنوان المناسبة | "e.g. Graduation party" / "مثل: حفل تخرج" | required when used | – | 60 | yes (only when title is NOT baked) |
| `eventDate` | date | Date / التاريخ | — / — | required | – | – | yes (metadata col) |
| `eventTime` | time | Time / الوقت | — / — | required | – | – | yes (metadata col) |
| `venue` | text | Venue / المكان | "e.g. Riyadh, Hilton Hall" / "مثل: الرياض، قاعة هيلتون" | required | – | 60 | yes (metadata col) |
| `primaryColor` | color | Primary Colour / اللون الأساسي | — | optional | – | – | **no** (style, last) |
| `fontFamily` | font | Font / الخط | — | optional | – | – | **no** (style, last) |

**Decisions baked into the table (flag in §F):**
- `parents` → **`parentsNames`** (clearer; matches plan's preferred name).
- `hostessName` → folded into **`hostName`** (one concept = inviter; gender lives
  in the typed value, not the key).
- `guestMessage` → **`invitationMessage`** (same concept).
- `weddingDate/partyDate/engagementDate/birthDate` → **`eventDate`**;
  `weddingTime/partyTime/engagementTime` → **`eventTime`** (rule 7).
- `hisName/herName` → **`groomName`/`brideName`** (rule 8).
- `eventNote` + `closingMessage` are the canonical names for the recurring short
  copy above/below the metadata row (replaces ad-hoc lines).

### B.2 Keys to DROP (no overlay, not visible content, or baked)

| dropped key | why |
|---|---|
| `invitationHeader` | The header word (`دعوة`/`بشارة`/occasion calligraphy) is **baked** into every source that has it. Keeping a field double-renders it (the #1 defect). |
| `announcement` | Same — `بشارة مولود` etc. is baked occasion art. |
| `groomFamilyName`, `brideFamilyName`, `brideFatherName` | Family/surname overlays do not appear as distinct large blocks in the references; they belong inside `invitationMessage` if at all. (Also the only place the forbidden surname lived.) |
| `age`, `weight` | Not visible overlays on any reference; form-only clutter. |
| `pilgrimName`, `conferenceTitle`, `organizerName`, `keynoteSpeaker`, `registrationUrl` | Legacy one-offs → map to `eventTitle`/`hostName`/`invitationMessage` or drop (conference/pilgrimage are unreferenced; see §D). |

### B.3 Forbidden-surname occurrences found (rule 10)

| file:line | content | action |
|---|---|---|
| `labbe-backend-/scripts/_templateCardVocab.js:64-65` | `"e.g. Khalid Al-Saud"` / `"مثل خالد آل سعود"` | replace with bare first name (`خالد` / `Khalid`) |
| `labbe-backend-/scripts/unifyTemplateInputs.js:117,126,135,144` | `"e.g. Khalid Al-Saud"` / `"مثل خالد آل سعود"` (×4) | obsolete script (see §E.4) — purge or delete file |
| `labbe-backend-/scripts/TEMPLATE_CARDS_REFRESH_PLAN.md:60` | table example `Khalid Al-Saud` | doc — scrub |
| `labbe-backend-/scripts/UNIFY_TEMPLATE_INPUTS_SUMMARY.md:95` | same surname | doc — scrub |
| `docs/implementation/TEMPLATES_SEED_6_PLAN.md:76` | `e.g. Al-Saud` (`groomFamilyName`) | doc — scrub |
| `docs/implementation/TEMPLATES_SEED_14_PLAN.md:105` | `e.g. آل سعود` | doc — scrub |
| **LIVE DB** (read-only scan) — `groomFamilyName.placeholderEn="e.g. Al-Saud"` / `placeholderAr="مثل آل سعود"` on **5 live templates**: Royal Wedding, Royal Navy Wedding, Pearl Frame Wedding, Royal Da'wah Wedding, Pearl Da'wah Wedding (**10 hits**) | the surname is already in production data; `groomFamilyName` is a **dropped** field, so the new specs remove it — but the rows must be replaced/updated, not left as-is |

> The `سعود`/`السعودية` hits in `districts.json`, `cities.json`, and the
> localization files are legitimate place names (King Saud University, "Saudi
> Arabia") — **not** the forbidden personal surname. No action.

### B.4 Standard metadata row (applies to ALL 20 templates)

One horizontal three-column row, **icon above value**, semantic order
**Date · Time · Venue**. Rendered RTL (Arabic-first), reading right→left, so the
visual placement is:

| column (visual) | leftPct | icon (decoration) | value (overlay) |
|---|---|---|---|
| right | **72** | `CalendarDays` | `eventDate` |
| centre | **50** | `Clock` | `eventTime` |
| left | **28** | `MapPin` | `venue` |

- icon decoration `topPct` = **R** (row anchor), `iconSizeVh` ≈ 2.2, `widthPct` ≈ 3.5
- value overlay `topPct` = **R + 4.5**, `fontSizeVh` ≈ 2.0, `widthPct`: Date 20 / Time 14 / Venue 22, `textAlign:"center"`
- **R is given per template below** (the measured vertical centre of the row).
- vs current seed: this **swaps Time↔Venue** columns so the order reads
  Date·Time·Venue instead of Time·Venue·Date. (Flag §F-1: confirm RTL ordering.)

---

## C. Per-template proposals (16 references)

Notation: overlay `(topPct, leftPct, widthPct, fontSizeVh, weight)`; all
`textAlign:center` unless noted; coordinates are **centres**. Colours marked
`custom #hex` are sampled from the reference; otherwise `primary` (host accent).
"R=" is the metadata-row icon anchor (values at R+4.5). `fontSizeVh` values are
starting points to refine in the forward-render check (diff box-height ≈ glyph
height, ~1.3× under the true font size).

---

### #1 Royal Groom — `marriage.jpg` / `1.png` — "Royal Groom / زفاف ملكي" — *wedding*
- **Dimensions:** 4500×8000 both; ratio 0.5625 = 0.5625, **0.0% diff**. Diff changed 3.4%.
- **Baked (no field):** hands+book photo; small top line ~5-8%; large `دعوة`
  calligraphy ~28-37% (centre ~33); bottom gold calligraphy ~74-83%; thin
  ornament ~89%. *(The plan's "final message below the metadata row" is this
  **baked** bottom calligraphy, not a dynamic field.)*
- **Dynamic fields (order):** `invitationMessage`, `eventDate`, `eventTime`,
  `venue`, `primaryColor`, `fontFamily`. Dark card → all text `custom #e8d3a0`.
- **Overlays:**
  | field | top | left | width | fz | weight | colour |
  |---|---|---|---|---|---|---|
  | invitationMessage | 45 | 50 | 68 | 2.4 | 400 | custom #e8d3a0 |
  | eventDate | 68.5 | 72 | 20 | 2.1 | 500 | custom #e8d3a0 |
  | eventTime | 68.5 | 50 | 14 | 2.1 | 500 | custom #e8d3a0 |
  | venue | 68.5 | 28 | 22 | 2.1 | 500 | custom #e8d3a0 |
- **Decorations:** metadata row **R=64**, colour #e8d3a0 (CalendarDays@72, Clock@50, MapPin@28).
- **Pairing:** single groom card (no bride name shown).
- **Rationale/uncertainty:** `invitationMessage` band 40-49% (3 lines). A faint
  gray block ~70-71% may be a `closingMessage` — low confidence; left out
  pending approval. `invitationMessage maxLength ≈ 180` (band height-limited).

---

### #2 Pearl Da'wah Wedding — `wedding_white_dawah.jpg` / `2.png` — "Pearl Da'wah Wedding / دعوة زفاف لؤلؤية" — *wedding*
- **Dimensions:** 4500×8000; 0.0%. Diff 7.8%.
- **Baked:** geometric border; **`دعوة` in the navy top badge ~5-9%**; small corner glyphs.
- **Dynamic fields:** `openingVerse`, `invitationMessage`, `hostName`,
  `groomName`, `eventDate`, `eventTime`, `venue`, style. Light card → `primary`.
- **Overlays:**
  | field | top | left | width | fz | weight |
  |---|---|---|---|---|---|
  | openingVerse | 28 | 50 | 64 | 3.0 | 700 |
  | invitationMessage | 40 | 50 | 76 | 2.5 | 400 |
  | hostName | 50.5 | 50 | 60 | 2.6 | 600 |
  | groomName | 64 | 47 | 57 | 5.5 | 700 |
- **Decorations:** metadata row **R=82**, colour #1f3b5e.
- **Pairing:** single groom (father/host invites to son's wedding).
- **Uncertainty:** the "host invites" formula occupies 28-57%; `openingVerse`
  vs `invitationMessage` split is by line size — confirm wording with product.

---

### #3 Royal Da'wah Wedding — `wedding_navy_dawah.jpg` / `3.png` — "Royal Da'wah Wedding / دعوة الفرح الملكي" — *wedding*
- **Dimensions:** 4500×8000; 0.0%. Diff 6.0%.
- **Baked:** navy geometric border; **`دعوة` in white top badge ~7-18%**.
- **Dynamic fields:** identical set to #2. **Dark card → all `custom #e8d3a0`** (gold on navy; sampled name region ≈ #e9eef2 highlight, use #e8d3a0 for warmth).
- **Overlays:** same geometry as #2 (top 28 / 40 / 50.5 / 64; widths 64/76/60/57; fz 3.0/2.5/2.6/5.5), all `custom #e8d3a0`.
- **Decorations:** metadata row **R=82**, colour #e8d3a0.
- **Pairing:** single groom.

---

### #4 Gulf Groom — `wedding_gulf_groom.jpg` / `4.png` — "Gulf Groom / زفاف الخليج" — *wedding*
- **Dimensions:** 4500×8000; 0.0%. Diff 8.7%.
- **Baked:** two-groom photo top ~3-22%; **`دعوة` ~30-40% (centre ~34)**; bottom gold calligraphy ~75-83%.
- **Dynamic fields:** `invitationMessage`, `hostName`, `eventDate`,
  `eventTime`, `venue`, style. Light/sand card → `primary` (dark text).
- **Overlays:**
  | field | top | left | width | fz | weight |
  |---|---|---|---|---|---|
  | invitationMessage | 54.5 | 50 | 79 | 2.4 | 400 |
  | hostName | 66.5 | 50 | 70 | 2.8 | 600 |
- **Decorations:** metadata row **R=58** (place between message and host)… *see note*. Sampled accent #a07f3f.
- **Note/uncertainty:** #4's layout is dense (message 54%, a second copy block
  66%). Recommend: `invitationMessage` 54.5, metadata **R=72** (values 76.5),
  `hostName` 66.5. Confirm whether the 66% block is host name or message line 2.

---

### #5 "Rose Garden Wedding" — `blessed_births.jpg` / `5.png` — *wedding*
- **Dimensions:** 4500×8000; 0.0%. **Diff 18% (source background differs from reference — measure from reference, source is generic floral).**
- **Baked:** rose clusters top corners + bottom band; pink ribbon ornament ~10-13%. **No `دعوة`** (script job list wrong here).
- **Dynamic fields:** `openingVerse`, `invitationMessage`, `groomName`,
  `eventDate`, `eventTime`, `venue`, style. `primary`.
- **Overlays:**
  | field | top | left | width | fz | weight |
  |---|---|---|---|---|---|
  | openingVerse | 24 | 50 | 65 | 2.3 | 500 |
  | invitationMessage | 33 | 50 | 66 | 2.3 | 400 |
  | groomName | 48 | 50 | 55 | 6.0 | 700 |
- **Decorations:** metadata row **R=58** (values 62.5), accent #c97a86.
- **Pairing:** **single groom** ("حسان", one centred calligraphic name) — *seed
  was wrong (couple)*. (§F: confirm single vs add bride.)
- **Uncertainty:** message is 4 lines (22-40%); `maxLength ≈ 160`, multiline gap
  applies.

---

### #6 "Burgundy Bloom Wedding" — `woman_invitation.jpg` / `6.png` — *wedding + ladies_event*
- **Dimensions:** 4500×8000; 0.0%. **Diff 12.9% (reference background richer than source).**
- **Baked:** `بسم الله`/ornament top ~5-10%; burgundy floral bottom half.
- **Dynamic fields:** `invitationMessage`, `groomName`, `brideName`, `eventDate`,
  `eventTime`, `venue`, style. `primary`.
- **Overlays (names side by side):**
  | field | top | left | width | fz | weight |
  |---|---|---|---|---|---|
  | invitationMessage | 24 | 50 | 76 | 2.4 | 400 |
  | groomName | 47 | **72** | 26 | 5.5 | 700 |
  | brideName | 47 | **28** | 26 | 5.5 | 700 |
- **Decorations:** metadata row **R=58** (values 62.5), accent #8b2243.
- **Pairing:** **couple** — verified two stacked burgundy names ("محمد" + "حليمة")
  in the reference. Per rule 4 they are placed **side by side** (groom right 72,
  bride left 28), overriding the reference's stacked arrangement. *(Seed used a
  generic couple set; key/coords corrected.)*
- **Uncertainty:** dual-category (also ladies_event); keep both. Reference stacks
  the names ~44-52%, so metadata sits below (~58%) above the floral bottom;
  confirm in-editor it doesn't collide with blooms.

---

### #7 "Floral Arch Wedding" — `marriage2.jpg` / `7.png` — *wedding*
- **Dimensions:** 4500×8000; 0.0%. **Diff 16.8% (background differs).**
- **Baked:** floral arch top; domed gazebo + flowers bottom; `بسم الله` ~16-20%.
- **Dynamic fields:** `invitationMessage`, `groomName`, `eventDate`,
  `eventTime`, `venue`, style. `primary`.
- **Overlays:**
  | field | top | left | width | fz | weight |
  |---|---|---|---|---|---|
  | invitationMessage | 30 | 50 | 60 | 2.3 | 400 |
  | groomName | 42 | 50 | 45 | 6.0 | 700 |
- **Decorations:** metadata row **R=57** (values 61.5), accent #9a8f80.
- **Pairing:** single groom ("نسمة"-style single calligraphy). *(seed was couple.)*

---

### #8 Candle Engagement — `engament.jpg` / `8.png` — "Candle Engagement / خطوبة الشموع" — *wedding + engagement*
- **Dimensions:** 4500×8000; 0.0%. **Diff 13.6%.**
- **Baked:** `بسم الله` + candle/floral ornament top ~3-13%; floral bottom.
- **Dynamic fields:** `invitationMessage`, `groomName`, `brideName`,
  `eventDate`, `eventTime`, `venue`, style. `primary`.
- **Overlays (names side by side):**
  | field | top | left | width | fz | weight |
  |---|---|---|---|---|---|
  | invitationMessage | 30 | 50 | 70 | 2.3 | 400 |
  | groomName | 48 | **72** | 26 | 5.5 | 700 |
  | brideName | 48 | **28** | 26 | 5.5 | 700 |
- **Decorations:** metadata row **R=60** (values 64.5), accent #c97a86.
- **Pairing:** **couple** — two names confirmed. RTL: **groom on the visual
  right (72), bride on the left (28)**.
- **Uncertainty:** a small connector glyph sits at ~50% between names; treat as
  baked or omit. (`&`/`و` is not an editable field.)

---

### #9 Sacred Vows — `marriage_contract_arch.jpg` / `9.png` — "Sacred Vows / عقد قران مبارك" — *wedding*
- **Dimensions:** 4500×8000; 0.0%. **Diff 21% (background differs strongly).**
- **Baked:** beige arch frame; `عقد قران`/`بسم الله` top ~3-12%; bottom calligraphy.
- **Dynamic fields:** `openingVerse`, `invitationMessage`, `groomName`,
  `eventDate`, `eventTime`, `venue`, style. `primary`.
- **Overlays:**
  | field | top | left | width | fz | weight |
  |---|---|---|---|---|---|
  | openingVerse | 24 | 50 | 70 | 2.3 | 500 |
  | invitationMessage | 31 | 50 | 66 | 2.3 | 400 |
  | groomName | 44 | 50 | 50 | 6.0 | 700 |
- **Decorations:** metadata row **R=58** (values 62.5), accent #9c7d4d.
- **Pairing:** one centred name ("ماجد"). **Recommend single `groomName`;
  optionally add `brideName` side-by-side if product wants both on a عقد قران**
  (§F-3). Drop `brideFatherName` (was a surname-bearing field, not a visible block).

---

### #10 Eid Al-Adha — `general_spring.jpg` / `10.png` — "Eid Al-Adha / عيد الأضحى" — *general_event*
- **Dimensions:** 4500×8000; 0.0%. Diff 5.3%.
- **Baked:** spring florals + animals bottom; **`عيد الأضحى` title baked ~24-32%**
  (occasion art). *(Seed's `eventTitle` overlay at ~30% would double-render it.)*
- **Dynamic fields:** `invitationMessage`, `eventNote`, `eventDate`,
  `eventTime`, `venue`, style. **No `eventTitle` field (baked).** `primary`.
- **Overlays:**
  | field | top | left | width | fz | weight |
  |---|---|---|---|---|---|
  | invitationMessage | 14 | 50 | 72 | 2.4 | 400 |
  | eventNote | 48 | 50 | 50 | 2.4 | 500 |
- **Decorations:** metadata row **R=56** (values 60.5), accent #7a8b6b.
- **Uncertainty:** `eventNote` is the "كل عام وأنتم بخير"-type greeting (~48%).

---

### #11 Ramadan Iftar — `general_lantern.jpg` / `11.png` — "Ramadan Iftar / سفرة إفطار رمضان" — *general_event*
- **Dimensions:** 4500×8000; 0.0%. Diff 4.0% (low → title is baked, not dynamic).
- **Baked:** lanterns + crescent top; **`سفرة إفطار رمضان` baked ~34-42%**.
- **Dynamic fields:** `invitationMessage`, `eventNote`, `eventDate`,
  `eventTime`, `venue`, style. **No `eventTitle` (baked).** `primary`.
- **Overlays:**
  | field | top | left | width | fz | weight |
  |---|---|---|---|---|---|
  | invitationMessage | 18 | 50 | 70 | 2.4 | 400 |
  | eventNote | 53 | 50 | 60 | 2.3 | 500 |
- **Decorations:** metadata row **R=66** (values 70.5), accent #a47148.

---

### #12 Birthday Party — `birthday.jpg` / `12.png` — "Birthday Party / حفلة عيد ميلاد" — *birthday*
- **Dimensions:** 4500×8000; 0.0%. Diff 3.5% (clean).
- **Baked:** bunting/balloons top ~5-12%; cake/table bottom ~80-100%. No baked name.
- **Dynamic fields:** `invitationMessage`, `celebrantName`, `eventNote`,
  `eventDate`, `eventTime`, `venue`, style. Font Cairo. `primary`.
- **Overlays:**
  | field | top | left | width | fz | weight |
  |---|---|---|---|---|---|
  | invitationMessage | 23 | 50 | 64 | 2.4 | 400 |
  | celebrantName | 38.5 | 50 | 71 | 6.0 | 700 |
  | eventNote | 51.5 | 50 | 43 | 2.3 | 500 |
- **Decorations:** metadata row **R=63** (values 67.5), accent #e0588a.
- **Uncertainty:** drop `age` (no overlay in reference). `eventNote` ~51% is a
  short line under the name.

---

### #13 Newborn Boy — `newborn_boy.jpg` / `13.png` — "Newborn Boy / بشارة المولود" — *baby_shower*
- **Dimensions:** 4500×8000; 0.0%. Diff 2.5% (clean).
- **Baked:** "H" monogram badge top; **decorative English `baby` ~31-34%** and
  **`Welcome` ~36%** (baked script words); `بشارة مولود` occasion art; blue
  cradle + florals bottom.
- **Dynamic fields:** `invitationMessage`, `babyName`, `parentsNames`,
  `eventDate`, `eventTime`, `venue`, style. `primary`.
- **Overlays:**
  | field | top | left | width | fz | weight |
  |---|---|---|---|---|---|
  | invitationMessage | 24 | 50 | 73 | 2.4 | 400 |
  | babyName | 44 | 50 | 58 | 6.5 | 700 |
  | parentsNames | 58 | 50 | 60 | 2.4 | 500 |
- **Decorations:** metadata row **R=70** (values 74.5) — **added per the
  all-templates standard** (seed had none), light blue accent #6a92a5.
- **Pairing:** n/a. **Drop `announcement`/`weight`.** `birthDate` → fold into the
  metadata `eventDate` (the announcement date). (§F-4.)
- **Uncertainty:** confirm the metadata row fits above the cradle (~80%+); if
  cramped, R may move to ~66.

---

### #14 Newborn Girl — `newborn_girl.jpg` / `14.jpg` — "Newborn Girl / بشارة الأميرة" — *baby_shower*
- **Dimensions:** 4500×8000; 0.0%. Diff 2.3% (clean).
- **Baked:** pink bows/garland top; **decorative English word ~30%**; pink
  carousel + florals bottom.
- **Dynamic fields:** `invitationMessage`, `babyName`, `parentsNames`,
  `eventDate`, `eventTime`, `venue`, style. `primary`.
- **Overlays:**
  | field | top | left | width | fz | weight |
  |---|---|---|---|---|---|
  | invitationMessage | 21 | 50 | 70 | 2.4 | 400 |
  | babyName | 40 | 50 | 50 | 6.5 | 700 |
  | parentsNames | 56 | 50 | 60 | 2.4 | 500 |
- **Decorations:** metadata row **R=70** (values 74.5) — **added per standard**,
  rose accent #d98aa0.
- **Pairing:** n/a. Drop `announcement`/`weight`.

---

### #15 "Graduation Celebration" — `marriage_contract_bronze.jpg` / `15.png` — *general_event*
- **Dimensions:** 4500×8000; 0.0%. **Diff 34.9% — HIGHEST. The source
  (`marriage_contract_bronze.jpg`) does NOT match the reference design**
  (reference has burgundy roses on both sides + bottom; source is mostly cream
  with edge flowers). **Either the wrong source is mapped, or the source needs
  re-export.** (§F-5 / §E flag.)
- **Baked:** chandelier ornament top; burgundy roses (reference only).
- **Dynamic fields:** `invitationMessage`, `celebrantName`, `eventDate`,
  `eventTime`, `venue`, style. `primary` (dark burgundy text on cream).
- **Overlays:**
  | field | top | left | width | fz | weight |
  |---|---|---|---|---|---|
  | invitationMessage | 22 | 50 | 58 | 2.4 | 400 |
  | celebrantName | 38 | 50 | 58 | 6.0 | 700 |
- **Decorations:** metadata row **R=49** (values 53.5), accent #823d42.
- **Pairing:** single celebrant ("بيان"). **Coordinates are LOW-CONFIDENCE until
  the source/reference mismatch is resolved.**

---

### #16 Pearl Promise — `engagement_pearl.jpg` / `16.png` — "Pearl Promise / وعد لؤلؤي" — *engagement*
- **Dimensions:** 4500×8000; 0.0%. Diff 3.5% (clean).
- **Baked:** large calligraphic ornament/monogram top ~4-16% (NOT specific
  names); pearl strands bottom.
- **Dynamic fields:** `invitationMessage`, `groomName`, `brideName`,
  `openingVerse`, `eventDate`, `eventTime`, `venue`, style. `primary`.
- **Overlays (names side by side):**
  | field | top | left | width | fz | weight |
  |---|---|---|---|---|---|
  | invitationMessage | 30 | 50 | 65 | 2.3 | 400 |
  | groomName | 49 | **78** | 22 | 5.0 | 700 |
  | brideName | 49 | **18** | 22 | 5.0 | 700 |
  | openingVerse | 60 | 50 | 75 | 2.3 | 500 |
- **Decorations:** metadata row **R=70** (values 74.5) — **added per standard**
  (seed had none), accent #8d8770.
- **Pairing:** **couple** — "فهد & هلا" confirmed. RTL: **groom right (78), bride
  left (18)**, "&" connector at 50 (baked/decoration, not a field).

---

## D. Proposed layouts for the 4 unreferenced backgrounds (coordinates = PROPOSED)

All four use the canonical vocabulary and the standard metadata row. No
reference was measured — placements are proposed from the named sibling.

### B1 — `wedding_navy_frame.jpg` — "Navy Frame Wedding / فرح الإطار الكحلي" — *wedding* — informed by **#3**
- **Source:** navy geometric frame; empty white rounded badge top-centre ~5-18%.
- **Baked:** frame + empty badge (no text baked).
- **Fields:** `openingVerse`, `invitationMessage`, `hostName`, `groomName`,
  `eventDate`, `eventTime`, `venue`, style. Dark → `custom #e8d3a0`.
- **Overlays (PROPOSED):** openingVerse (28,50,64,3.0,700); invitationMessage
  (40,50,76,2.5,400); hostName (50.5,50,60,2.6,600); groomName (64,50,57,5.5,700).
- **Decorations (PROPOSED):** metadata row **R=82**, #e8d3a0.
- **Note:** unlike #3, `دعوة` is **not** baked here → optionally allow a header
  in the badge as a dynamic `eventNote` at (12,50,30,3.0,700). Flag §F-6.

### B2 — `wedding_white_frame.jpg` — "White Frame Wedding / فرح الإطار اللؤلؤي" — *wedding* — informed by **#2**
- Mirror of B1 on cream with a navy badge. Same field set, `primary` (navy text).
- **Overlays (PROPOSED):** same geometry as B1; colour `primary`.
- **Decorations (PROPOSED):** metadata row **R=82**, #1f3b5e.

### B3 — `general_pilgrimage.jpg` — "Sacred Pilgrimage / بشارة الحج" — *general_event* — informed by **#10/#11**
- **Source:** Kaaba photo; a **baked dark banner-plate ~46-54%** (holds the title).
- **Baked:** photo + arch frame + the dark plate.
- **Fields:** `eventTitle`, `invitationMessage`, `eventDate`, `eventTime`,
  `venue`, style. Dark photo → `custom #f4e9c9`.
- **Overlays (PROPOSED):** invitationMessage (18,50,70,2.4,400); **eventTitle on
  the baked plate** (50,50,60,4.0,700, custom #f4e9c9).
- **Decorations (PROPOSED):** metadata row **R=72**, #f4e9c9.
- **Note:** here `eventTitle` IS dynamic (plate is empty), unlike #10/#11.

### B4 — `conference.jpg` — "Visionary Conference / مؤتمر القادة" — *conference* — informed by **#1 (dark)** — *(this is live id `69fb550534860e1f4dc8c96a`)*
- **Source:** man in thobe facing a purple/blue gradient; dark negative space upper-left.
- **Baked:** photo + gradient only.
- **Fields:** `eventTitle`, `invitationMessage`, `hostName`, `eventDate`,
  `eventTime`, `venue`, style. Dark → `custom #e8d3a0`. *(Drop legacy
  `keynoteSpeaker`/`registrationUrl`/`organizerName` → `hostName`; see §E.)*
- **Overlays (PROPOSED, left-anchored over dark space, `textAlign:"right"` RTL):**
  eventTitle (26,30,56,5.0,700); invitationMessage (40,30,52,2.4,400); hostName
  (50,30,50,2.8,500) — all custom #e8d3a0.
- **Decorations (PROPOSED):** metadata row over dark band **R=66**, columns
  shifted left (Date@56, Time@34, Venue@14) to stay off the figure, #e8d3a0.
- **Note:** the only card whose metadata row is **not** centred — flag §F-7 that
  the standard row is left-shifted here to avoid the photographed figure.

---

## E. Delta from current seed / live DB

**Two baselines differ:** the **live DB** (legacy keys, what events actually
store) and **`seedTemplateCards.js`** (intended-but-unapplied refresh). Both are
superseded by §B/§C.

### E.1 Live-DB → canonical key migration (BREAKS stored `event.fieldValues`)

Events created against the live templates store these keys. Renaming them in the
template **orphans the stored values** unless events are migrated in lockstep.

| live key(s) | canonical | templates affected (live) |
|---|---|---|
| `groomFamilyName`, `brideFamilyName`, `brideFatherName` | **drop** (move into message) | Royal Wedding, Royal Navy/Pearl Frame, all Da'wah, Gulf Groom, Sacred Vows, Bronze Bloom, Pearl Promise |
| `hisName`/`herName` | `groomName`/`brideName` | Pure Promise |
| `weddingDate`/`weddingTime` | `eventDate`/`eventTime` | Garden Wedding |
| `partyDate`/`partyTime` | `eventDate`/`eventTime` | Sweet Celebration |
| `engagementDate`/`engagementTime` | `eventDate`/`eventTime` | Pure Promise, Pearl Promise |
| `birthDate` | `eventDate` | Blessed Newborn, Little Prince/Princess |
| `guestMessage` | `invitationMessage` | Garden Wedding, Sweet Celebration, Blessed Newborn, Ladies' Gathering, Little Prince/Princess, Spring Meadow, Lantern Night, Conference |
| `hostessName` | `hostName` | Ladies' Gathering, Pearl Promise |
| `eventTitle` (where baked) | **drop overlay** | Spring Meadow (#10), Lantern Night (#11) |
| `pilgrimName` | drop → `eventTitle` | Sacred Pilgrimage |
| `conferenceTitle`/`organizerName`/`keynoteSpeaker`/`registrationUrl` | `eventTitle`/`hostName`/drop/drop | Visionary Conference |
| `age`, `weight` | drop | Sweet Celebration, Little Prince/Princess |
| `parents` | `parentsNames` | Blessed Newborn, Little Prince/Princess |

> **Measured exposure (read-only DB):** events store
> `visualTemplate = { templateRef→Template, fieldValues:{[key]:value},
> bakedImagePath, isCustomUpload }` (`EventModel.js:116-135`). **Live counts:
> 5 events total, 3 reference these templates** (Garden Wedding ×2, Royal Wedding
> ×1; sampled event is `status=deleted`, `fieldValues` keys
> `[brideName,groomName,weddingDate,weddingTime,venue,guestMessage]`). Because the
> invitation is **pre-baked** to `bakedImagePath` at Step-3, a key rename does
> **not** change any already-issued invitation — it only leaves stale
> `fieldValues` that matter solely if one of the ≤3 events is re-edited. So this
> is **low risk**, not a blocker: ship a small `fieldValues` key-rename for the
> ≤3 events (§E.1 map) or accept the re-edit cost. See §F-8.

### E.2 Per-template structural delta vs the seed (highlights)

| template | add | remove | replace |
|---|---|---|---|
| #1 Royal Groom | (none) | **`invitationHeader` field+overlay (baked `دعوة`)** | metadata order Time/Venue/Date → Date/Time/Venue |
| #2/#3 Da'wah | — | `invitationHeader` overlay (baked badge) | metadata R, column order |
| #5/#7 | — | **`brideName`** (single-groom cards) | `COUPLE_WEDDING` → single groom |
| #6 | — | — | keep couple; names side-by-side (72/28), corrected coords |
| #8/#16 | confirm side-by-side names | — | name `leftPct` to 72/28 (#8), 78/18 (#16) |
| #9 Sacred Vows | — | `brideFatherName`; (optional bride) | openingVerse kept |
| #10/#11 | `eventNote` | **`eventTitle` overlay (baked title)** | — |
| #12 | `eventNote` | `age` | metadata order |
| #13/#14 | **metadata row (Date/Time/Venue)**, `parentsNames` | `announcement`, `weight`, `birthDate`→`eventDate` | — |
| #15 | metadata row | — | **resolve source/reference mismatch first** |
| #16 | metadata row | — | names side-by-side |
| B1–B4 | metadata row standard | legacy one-off keys | per §D |

### E.3 Metadata-row order change (all templates)

`metaRow` currently renders visual Left→Right = Time, Venue, Date. New standard
= **Date(right) · Time(centre) · Venue(left)**. This is a code change in the
seed helper (swap the Time and Venue `leftPct`), not a per-card edit.

### E.4 Obsolete scripts (do not layer a 4th source of truth)

- `unifyTemplateInputs.js`, `updateTemplateLayouts.js` — **older competing
  passes**; they produced the legacy keys now in the live DB. Treat as
  **obsolete**; do not run again. Recommend deleting (they also carry the
  forbidden surname). `verify_visual_alignment.js` draws one-line boxes only and
  is not a real diff test → superseded by `plans/template-audit/measure.js`.

---

## F. Approval checklist (decide before implementation)

1. **Metadata-row RTL order:** confirm visual **Date(right=72) · Time(centre=50)
   · Venue(left=28)** with icon-above-value (CalendarDays/Clock/MapPin). ✅/✏️
2. **Add the standard Date/Time/Venue row to ALL templates,** including
   newborns (#13/#14) and engagements (#16) that currently have none. ✅/✏️
3. **Couple vs single names (verified by zoom):** **single `groomName`** for
   #1/#2/#3/#4/#5/#7/#9; **groom+bride side-by-side** for **#6**/#8/#16.
   Optionally add `brideName` to #9 (عقد قران, currently one name). ✅/✏️
4. **Vocabulary renames:** `parents`→`parentsNames`; `hostessName`→`hostName`;
   `guestMessage`→`invitationMessage`; `birthDate`→`eventDate`;
   drop `invitationHeader`, `announcement`, `age`, `weight`, family/father names.
   ✅/✏️
5. **Baked titles stay baked:** #10 `عيد الأضحى`, #11 `سفرة إفطار رمضان`, newborn
   `بشارة`/`baby`/`Welcome`, all `دعوة` badges/calligraphy → **no overlay**. ✅/✏️
6. **Unreferenced cards:** approve §D proposed layouts; decide whether B1/B2
   badges get a dynamic header and whether B4's metadata row may be left-shifted
   off the figure. ✅/✏️
7. **#15 source/reference mismatch:** `marriage_contract_bronze.jpg` does not
   match `15.png`. Decide: re-map source, re-export the source from the
   reference, or accept reference-based coordinates as provisional. ✅/✏️
8. **Event `fieldValues` migration (LOW RISK — verified, was overstated):**
   measured against the live DB: **5 events total, only 3 reference these 20
   templates** (Garden Wedding ×2, Royal Wedding ×1), and the sampled one is
   `status=deleted`. Every event also stores a frozen `visualTemplate.bakedImagePath`
   — the invitation image is already rendered, so renaming keys **cannot** alter
   an existing baked invitation. Stale `fieldValues` keys only surface if one of
   the ≤3 events is **re-edited** in the update wizard. **Recommendation:** ship a
   tiny one-off `event.visualTemplate.fieldValues` key-rename (per §E.1) for
   tidiness, or accept the ≤3-event re-edit cost. Not a blocker. ✅/✏️
9. **Forbidden-surname scrub:** replace the placeholder in `_templateCardVocab.js`
   and scrub/delete `unifyTemplateInputs.js`, the two `TEMPLATES_SEED_*` docs,
   and the two summary/plan docs (§B.3). ✅/✏️
10. **fontSizeVh / multiline:** accept that `fontSizeVh` values are starting
    points to be tuned in the forward-render check, and that faithful multiline
    `invitationMessage` needs a renderer `lineHeight` (+ enforced `maxLength`)
    addition (§A.2). ✅/✏️

---

## Implementation-phase plan (after approval — NOT executed now)

1. Add `lineHeight` (and optionally `whiteSpace`) to `overlaySchema` +
   `OverlayItem`; keep backward-compatible defaults.
2. Rewrite `_templateCardVocab.js` to §B (remove surname, add `eventNote`,
   `closingMessage`, `parentsNames`; drop dead keys).
3. Rewrite the 20 specs in `seedTemplateCards.js` per §C/§D; fix `metaRow`
   order; remove baked-art overlays.
4. Extend `measure.js` with a **forward renderer** (draw proposed overlays onto
   each source, composite against the reference) → produce before/after proof
   images for every card **before** any DB write.
5. Write an **idempotent** update script: match live rows by source filename
   (stable) rather than `nameEn`; preserve `_id`; send `expectedVersion`; do
   **not** re-upload images (sources already in S3); `--dry-run` prints the exact
   field/overlay/decoration diff per template.
6. Write the **event `fieldValues` key migration** (§E.1) and run it in the same
   maintenance window (dry-run first).
7. Verify admin preview **and** host Step-3 baked output for all 20 with Arabic
   sample values (never the forbidden surname).

---

### Artifacts produced (read-only, this phase)

- `plans/template-audit/measure.js` — diff/measure/annotate tool.
- `plans/template-audit/zoom.js` — native-resolution band zoom.
- `plans/template-audit/db_inspect.js` — read-only DB snapshot (already run).
- `plans/template-audit/db_events.js` — read-only event-dependency + live
  surname-placeholder scan (already run).
- `plans/template-audit/out/` — `card_##_*.png` (annotated ref | gridded src),
  `grid_*.png` (4 unreferenced), `measurements.json`, `zoom/*` crops.
