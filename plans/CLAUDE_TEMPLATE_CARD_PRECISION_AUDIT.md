# Claude Code task: precision audit for dynamic invitation template cards

Work in `D:\halla`. This task requires visual precision and careful repository analysis.

## Objective

The numbered images in `D:\halla\labbe\public\template-cards` are completed reference invitations. The images in `D:\halla\template-cards` are the corresponding source backgrounds used by dynamic templates.

Hosts choose a template in Step 3 of event creation, fill dynamic fields, and the application renders those values plus icons over the source background. The rendered result should closely match the completed reference invitation in content hierarchy, grouping, spacing, and placement.

The existing seed definitions are inaccurate. Do **not** assume their current fields or coordinates are correct.

## Critical phase boundary

This first phase is analysis and proposal only.

- Do not edit application code.
- Do not edit seed scripts.
- Do not run a seed, migration, update script, cleanup script, or any command that writes to MongoDB/S3.
- Do not change the database through the admin UI.
- First present a complete per-template specification for approval.
- Wait for explicit approval before implementing an idempotent DB update script.

Read-only repository inspection, image analysis, local API GETs, and read-only database inspection are allowed.

## User requirements that override current seeds

1. Every template must use the same canonical keys for the same concept. Never invent template-specific synonyms for shared concepts.
2. Every template must contain a standard three-column metadata row in this semantic order:
   - `eventDate` with a calendar icon
   - `eventTime` with a clock icon
   - `venue` with a location-pin icon
3. The three metadata groups must appear on one horizontal row. Every group is vertically arranged as icon above value. This standard applies even when a reference uses another visual order or omits one of these items.
4. When both `groomName` and `brideName` are used, their overlays must be side by side on the same row.
5. Use `invitationMessage` for the principal long invitation copy. It must be a `textarea`, `rows: 3`, with a realistic maximum length based on the available box.
6. Repeated short copy below/around the metadata row must use consistent keys across templates. Propose a small canonical vocabulary such as `eventNote` and `closingMessage`; do not create one-off names that mean the same thing.
7. Use `eventDate`, `eventTime`, and `venue` everywhere. Do not use `weddingDate`, `partyDate`, `location`, `address`, or similar aliases.
8. Use `groomName` and `brideName` everywhere those concepts occur.
9. Arabic labels and placeholders must be natural and consistent. English labels/placeholders must also be supplied.
10. Never use `آل سعود`, `Al-Saud`, or any transliteration/casing variant in any label, placeholder, default, example, test fixture, or proposed value. Search the relevant existing files and call out every violation.
11. Do not add `defaultValue` for editable content. Examples belong in placeholders only.
12. `primaryColor` and `fontFamily` are style controls, not visible content. Keep them last in field order and do not create text overlays for them.
13. Every editable visible field needs exactly one overlay. Every overlay must reference a real field. Style-only fields are the only permitted form-only fields.
14. Do not turn text already baked into the source background into an editable overlay unless there is a clear product reason and the baked copy is first removed from the source image.

## Important distinction: baked artwork versus editable content

Some source JPGs were modified by `labbe-backend-\scripts\bake_calligraphy.js`. For example, the large `دعوة` artwork in reference `1.png` is already present in `template-cards\marriage.jpg`. It must not also become an editable field or it will render twice.

For every reference/source pair:

1. Compare the completed reference with the actual current source background pixel-for-pixel or visually.
2. Classify every visible text/art element as either:
   - `baked`: already present in the source; no field/overlay, or
   - `dynamic`: absent from the source; requires a field and overlay.
3. Explicitly list baked text in the report so the decision is auditable.

Do not infer this only from `bake_calligraphy.js`; inspect the current image files because that script overwrote source JPGs.

## Confirmed reference-to-source mapping

| Ref | Completed reference | Source background | Current working name |
|---:|---|---|---|
| 1 | `1.png` | `marriage.jpg` | Royal Groom |
| 2 | `2.png` | `wedding_white_dawah.jpg` | Pearl Da'wah Wedding |
| 3 | `3.png` | `wedding_navy_dawah.jpg` | Royal Da'wah Wedding |
| 4 | `4.png` | `wedding_gulf_groom.jpg` | Gulf Groom |
| 5 | `5.png` | `blessed_births.jpg` | Rose Garden Wedding |
| 6 | `6.png` | `woman_invitation.jpg` | Burgundy Bloom Wedding |
| 7 | `7.png` | `marriage2.jpg` | Floral Arch Wedding |
| 8 | `8.png` | `engament.jpg` | Candle Engagement |
| 9 | `9.png` | `marriage_contract_arch.jpg` | Sacred Vows |
| 10 | `10.png` | `general_spring.jpg` | Eid Al-Adha |
| 11 | `11.png` | `general_lantern.jpg` | Ramadan Iftar |
| 12 | `12.png` | `birthday.jpg` | Birthday Party |
| 13 | `13.png` | `newborn_boy.jpg` | Newborn Boy |
| 14 | `14.jpg` | `newborn_girl.jpg` | Newborn Girl |
| 15 | `15.png` | `marriage_contract_bronze.jpg` | Graduation Celebration |
| 16 | `16.png` | `engagement_pearl.jpg` | Pearl Promise |

Four backgrounds have no completed numbered reference. Analyze them separately and propose a layout that follows the same standards without pretending that it was measured from a reference:

- `wedding_navy_frame.jpg`
- `wedding_white_frame.jpg`
- `general_pilgrimage.jpg`
- `conference.jpg`

Label all coordinates for these four as **proposed**, not measured.

## Existing defects already observed

- Card 1 is not a simple coordinate nudge. Its source already contains the large `دعوة` calligraphy. The completed reference contains dynamic three-line invitation copy, at least two additional short message blocks, date/time/venue values, and a final message below the metadata row. The current seed incorrectly creates an `invitationHeader` overlay for baked art and omits visible dynamic copy.
- `_templateCardVocab.js` currently contains forbidden `Al-Saud` / `آل سعود` placeholder examples.
- `seedTemplateCards.js` currently defines the metadata helper in the order Clock, MapPin, Calendar and uses matching value positions. The required semantic standard is Date, Time, Venue with calendar, clock, and location-pin icons.
- The current seed comments admit that positions were estimated and need nudging. Treat all coordinates as untrusted.
- `updateTemplateLayouts.js` and `unifyTemplateInputs.js` represent older/competing passes and contain legacy names/default behavior. Determine whether they are obsolete; do not layer another contradictory source of truth on top.
- `verify_visual_alignment.js` only draws approximate one-line boxes whose height equals one font size. That is insufficient for multiline text and is not a real visual-difference test.
- `OverlayItem.jsx` centers overlays with `translate(-50%, -50%)`; therefore `topPct` and `leftPct` are center coordinates, not top-left coordinates.
- `TemplatePreviewCanvas.jsx` falls back to `labelEn` for empty Arabic previews. Account for this when validating Arabic layouts; use representative Arabic sample values.

## Files to inspect before proposing anything

### Images and existing analysis artifacts

- `D:\halla\labbe\public\template-cards\1.png` through `16.png` (`14.jpg`)
- every image in `D:\halla\template-cards`
- `D:\halla\plans\template-reference-1-4.png`
- `D:\halla\plans\template-reference-5-8.png`
- `D:\halla\plans\template-reference-9-12.png`
- `D:\halla\plans\template-reference-13-16.png`

The overview sheets are navigation aids only. Use original-resolution files for measurements.

### Backend/data contract

- `D:\halla\labbe-backend-\scripts\seedTemplateCards.js`
- `D:\halla\labbe-backend-\scripts\_templateCardVocab.js`
- `D:\halla\labbe-backend-\scripts\bake_calligraphy.js`
- `D:\halla\labbe-backend-\scripts\unifyTemplateInputs.js`
- `D:\halla\labbe-backend-\scripts\updateTemplateLayouts.js`
- `D:\halla\labbe-backend-\scripts\verify_visual_alignment.js`
- `D:\halla\labbe-backend-\scripts\TEMPLATE_CARDS_REFRESH_PLAN.md`
- `D:\halla\labbe-backend-\models\TemplateModel.js`
- `D:\halla\labbe-backend-\src\modules\templates\templates.service.js`

### Admin editor and host rendering path

- `D:\halla\labbe\app\[lang]\admin-dash\templates\_components\templateSchema.js`
- `D:\halla\labbe\app\[lang]\admin-dash\templates\_components\TemplateEditorPage.jsx`
- `D:\halla\labbe\app\[lang]\admin-dash\templates\_components\FieldsSection.jsx`
- `D:\halla\labbe\app\[lang]\admin-dash\templates\_components\OverlaysSection.jsx`
- `D:\halla\labbe\app\[lang]\admin-dash\templates\_components\TemplateDecorationsSection.jsx`
- `D:\halla\labbe\components\shared\TemplatePreviewCanvas.jsx`
- `D:\halla\labbe\components\shared\OverlayItem.jsx`
- `D:\halla\labbe\app\[lang]\host\create-event\_components\templateForm\DynamicTemplateForm.jsx`
- `D:\halla\labbe\app\[lang]\host\create-event\_components\templateForm\renderField.jsx`
- `D:\halla\labbe\app\[lang]\host\create-event\_components\templateForm\useTemplateBake.js`
- `D:\halla\labbe\utils\schemas\createEventSchema.js`

Also inspect the current UI read-only at:

- `http://localhost:3000/ar/admin-dash/templates`
- `http://localhost:3000/ar/admin-dash/templates/69fb550534860e1f4dc8c96a`
- the create-template route reachable from the list page
- Step 3 of host create-event

If authentication blocks access, report that clearly and continue with source inspection. Do not mutate or submit forms.

## Required analysis method

1. Inventory all 16 completed references and all 20 source backgrounds.
2. Verify dimensions and aspect ratios. Report exact pixel dimensions and ratio differences.
3. Compare each mapped pair and identify baked versus dynamic content.
4. Inspect the current DB document read-only when available, especially ID `69fb550534860e1f4dc8c96a`, and identify its source filename/current template name.
5. Trace how fields, overlays, decorations, date formatting, time formatting, RTL text, font size, and HTML-to-image baking behave in the real renderer.
6. Establish one canonical vocabulary table before assigning fields to templates.
7. Measure each dynamic text block from the original completed image. Because the renderer uses center coordinates, report center `topPct`/`leftPct`, `widthPct`, `fontSizeVh`, font weight, alignment, color binding/custom color, font family, and z-index.
8. For multiline text, estimate and report line count, line-height requirements, and safe maximum length. If the current schema/renderer cannot control line height or constrain box height, identify that as an implementation gap instead of faking precision with coordinates.
9. Design the required standard metadata row for every template. Report one icon decoration plus one value overlay per column. Ensure the visual RTL/LTR arrangement is deliberate and documented.
10. For wedding/engagement cards containing both names, place `groomName` and `brideName` side by side and report which appears on the visual right and left in Arabic.
11. Use representative Arabic sample values when validating fit, but never a forbidden surname.
12. Generate or improve a local, non-DB visual verification method that can render proposed overlays on source backgrounds and compare them against completed references. In this phase, describe the method and optionally create read-only/generated artifacts, but do not modify production definitions.

## Canonical vocabulary deliverable

Propose a compact shared vocabulary. At minimum include:

- `invitationMessage`
- `eventNote`
- `closingMessage`
- `groomName`
- `brideName`
- `hostName`
- `celebrantName`
- `babyName`
- `parentsNames` (decide whether this should replace the current `parents`, and explain migration impact)
- `eventTitle`
- `eventDate`
- `eventTime`
- `venue`
- any genuinely distinct template-specific concept that cannot reuse the above
- `primaryColor`
- `fontFamily`

For each key specify type, English/Arabic labels, English/Arabic placeholders, required policy, rows, maximum length, numeric bounds where relevant, and whether it receives an overlay. Use the exact same definition wherever the key appears.

## Required report format

Start with a short findings summary, then provide these sections.

### A. Current architecture and blockers

Explain the coordinate/rendering contract and any schema or renderer limitations that prevent a faithful match (for example multiline line height, white-space behavior, clipping, icon/value grouping, or Arabic fallback text).

### B. Canonical vocabulary

One table containing all canonical field definitions. Include a separate list of legacy aliases to remove/migrate and every forbidden placeholder occurrence found.

### C. Per-template proposal for all 16 references

For each template, provide:

1. reference file, source file, English/Arabic name, category/categories;
2. exact dimensions and ratio check;
3. baked elements (no field);
4. ordered dynamic fields with type, labels, placeholders, required flag, rows/max length;
5. overlay table with every coordinate/style property;
6. decoration table, including the standard Calendar/Clock/MapPin row;
7. groom/bride pairing decision where applicable;
8. a short rationale and any uncertainty.

Do not write vague descriptions such as “near the middle.” Supply numeric percentages.

### D. Proposed layouts for the four unreferenced backgrounds

Use the same format, but mark coordinates as proposed and explain which referenced sibling informed the layout.

### E. Delta from current seed/DB

For each template, list fields to add/remove/rename, overlays to add/remove, and decorations to replace. Call out any changes that would break events already storing old `fieldValues` keys.

### F. Approval checklist

End with a concise checklist of decisions requiring user approval. Do not implement until the user approves the complete specification.

## Quality bar and acceptance criteria for the later implementation phase

These criteria guide the proposal now and will govern implementation after approval:

- all 20 templates use the approved vocabulary;
- no forbidden surname appears anywhere in relevant templates/scripts/tests;
- every template has Date, Time, Venue as one horizontal three-group row with icon above value;
- all bride/groom pairs are side by side;
- no baked artwork is duplicated as dynamic text;
- no orphan overlays and no visible content fields without overlays;
- source/reference aspect ratios are verified;
- Arabic sample text stays inside intended boxes at realistic maximum lengths;
- coordinates are responsive because they remain percentages of the natural image;
- a dry-run reports exact intended DB changes;
- the future update script is idempotent, preserves template IDs unless the approved migration explicitly says otherwise, uses optimistic versioning correctly, and does not upload/rewrite images unnecessarily;
- visual verification artifacts are produced before any apply-mode DB update;
- both admin preview and Step 3/final baked output are verified after implementation.

Be skeptical of existing comments and old plans. The original completed images, the current source backgrounds, and the actual renderer are the evidence.
