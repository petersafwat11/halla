# Plan — Seed 14 Visual Invitation Templates from `template-cards/new/`

## 1. Goal

Use the 14 background images in `D:\halla\template-cards\new\` (renamed to ASCII — see §2.2) to add 14 production-ready visual templates on top of the 6 already seeded by `seedTemplateCards.js` + `updateTemplateLayouts.js` (see `TEMPLATES_SEED_6_PLAN.md`). Arabic filenames already encoded category intent — each card is mapped to a sensible category, given a tasteful field set, and gets overlays positioned over the image's safe zone with decorations chosen from `IconPicker.jsx`.

After this work the host's category filter in Step Three should expose **6 + 14 = 20** templates spanning weddings (men's, women's, marriage-contract variants — all under one `wedding` code), engagement (men's + women's), baby shower (boys + girls + neutral), ladies' events, general/religious events, and a corporate conference.

## 2. Inputs

### 2.1 File → name → category map (post-rename — see §2.2)

| # | File (ASCII) | Visual style (confirmed) | Proposed name (EN / AR) | Category |
|---|---|---|---|---|
| 1 | `wedding_navy_frame.jpg` | Deep-navy frame with arabesque pattern; small white "tag" notch top-centre; wide empty navy interior | Royal Navy Wedding / `الفرح الملكي` | `wedding` |
| 2 | `wedding_white_frame.jpg` | White frame with arabesque watermark; navy "tag" notch top-centre; wide empty white interior | Pearl Frame Wedding / `فرح اللآلئ` | `wedding` |
| 3 | `wedding_navy_dawah.jpg` | Same navy frame as #1 but the white tag carries a navy "دعوة" calligraphy header | Royal Da'wah Wedding / `دعوة الفرح الملكي` | `wedding` |
| 4 | `wedding_white_dawah.jpg` | Same white frame as #2 but the navy tag carries a white "دعوة" calligraphy header | Pearl Da'wah Wedding / `دعوة الفرح اللؤلؤية` | `wedding` |
| 5 | `wedding_gulf_groom.jpg` | Off-white background; full-figure groom in white thobe + cream bisht top-third; gold calligraphy band along bottom | Gulf Groom / `زفاف الخليج` | `wedding` |
| 6 | `marriage_contract_arch.jpg` | White/silver Islamic-geometric watermark; thin arch line top; large faded grey "أفراحنا بزواكم وحضوركم" calligraphy bottom | Sacred Vows / `عقد قران مبارك` | `wedding` |
| 7 | `marriage_contract_bronze.jpg` | Cream watercolour with brown peony clusters in top-left and bottom-right corners | Bronze Bloom Vows / `عقد قران الورد` | `wedding` |
| 8 | `engagement_pearl.jpg` | Cream linen background; pearl-studded white peonies along the bottom-left curving up the centre | Pearl Promise / `خطوبة لؤلؤية` | `engagement` |
| 9 | `newborn_boy.jpg` | Pale cream paper; blue-watercolour cradle bottom-centre framed by blue florals + small blue ribbon-bow icon top; pink butterfly accent | Little Prince / `بشارة المولود` | `baby_shower` |
| 10 | `newborn_girl.jpg` | Pink watercolour; chandelier+ribbon swag top, pink carousel + small carriages bottom | Little Princess / `بشارة الأميرة` | `baby_shower` |
| 11 | `general_spring.jpg` | Soft sky-blue with clouds; pink cosmos + watercolour lambs along the bottom; pink butterfly top-left — Eid al-Adha-leaning | Spring Meadow / `ربيع المناسبات` | `general_event` *(NEW — see §4)* |
| 12 | `general_lantern.jpg` | Cream paper; gold mandala bottom-right + top-left fade; three brass lanterns hanging top-centre with gold crescent — Ramadan/Eid feel | Lantern Night / `ليلة الفوانيس` | `general_event` *(NEW)* |
| 13 | `general_pilgrimage.jpg` | Photo of the Ka'aba with crowd; faded white frame top; dark green text band middle; second smaller band bottom — Hajj/Umrah | Sacred Pilgrimage / `بشارة الحج` | `general_event` *(NEW)* |
| 14 | `conference.jpg` | Dark blue/teal bokeh background; full-figure man in white thobe + red shemagh on the right looking left; left half is empty deep-blue with cyan highlights | Visionary Conference / `مؤتمر القادة` | `conference` *(NEW — see §4)* |

> Numbering #1..#14 is the canonical reference used in §5 / §6 / §7.

### 2.2 ASCII rename done

The original Arabic filenames produced by the design team risked failure inside `multer`/`sharp`/S3 key generation on Win11 + Node 20 (mojibake on stream chunks, percent-encoding edge cases on PUTs). The 14 source files were renamed to the ASCII names in §2.1 via `mv`. The rename is complete and present in the working tree — no other code path references the old names, so this is a one-shot substitution. The originals were not preserved (they're tracked artistic assets, not source-of-truth metadata).

## 3. Findings (verified — the editor and DB are in the state §6-plan left them)

- Editor, model, schema, fonts, decoration system, host preview behaviour are all unchanged from §3 of `TEMPLATES_SEED_6_PLAN.md`. **Re-read that section instead of restating it.**
- The 6 seeded templates from the previous plan are live and indexed by `nameEn`. Idempotency in `seedTemplateCards.js` keys on `nameEn`, so the new wave can extend that script's `TEMPLATES` array (or run as a sibling — see §7) without touching existing rows.
- 5 categories already exist active: `wedding`, `engagement`, `birthday`, `baby_shower`, `ladies_event`. **2 new categories** are needed for this wave (see §4).
- `IconPicker.jsx` ICON_MAP includes (relevant subset): `Heart, Star, Sparkles, Sparkle, Crown, Diamond, Gem, Flower2, Flower, Leaf, Rose, Wheat, MoonStar, Moon, Stars, Sun, HeartHandshake, HandHeart, HeartPulse, Bird, Cake, Gift, PartyPopper, Ribbon, Award, Trophy, Mic, Mic2, Users, Globe, Building, Building2, Landmark, Castle`. **No `Lantern` icon exists** — substitute `Stars` + `Sparkle` for the lantern card.
- Arabic-capable fonts: `cairo`, `amiri`, `ibm_plex_arabic`, `noto_sans_arabic`. Most cards in this wave should use `'Amiri', serif` (calligraphic, formal, religious-friendly); the playful baby-shower / corporate-conference cards use `'Cairo', sans-serif`.
- **Form-field rule (locked by user 2026-05-06):** *every* field on a template must paint on the canvas (i.e. there must be an overlay whose `fieldKey` matches it). Form-only fields are explicitly disallowed — older templates were trimmed for the same reason. The §6 specs in this plan honour that rule: Sacred Pilgrimage (§6.13), Little Prince (§6.9), and Little Princess (§6.10) had earlier drafts with form-only fields; those have been removed.

## 4. Decisions — locked by user (2026-05-06)

1. **Two new categories** — needed before any new template can save (`categories.length >= 1` in the model):
   - `general_event` / EN: `General Event` / AR: `مناسبات عامة` — sortOrder `60` (after ladies_event=50)
   - `conference` / EN: `Conference` / AR: `مؤتمر` — sortOrder `70`
   
   *Rejected* the original §6-plan suggestion to add `marriage_contract`. Both عقد قران cards live under existing `wedding` instead — fewer top-level filters, simpler picker.
2. **Men's wedding cards stay under `wedding`.** Cards #1–#5 here all live under `wedding` and differ only by name + image. Combined with the 2 marriage-contract cards (#6, #7), the existing 2 wedding templates, and Garden Wedding, this yields **9 wedding templates total** under one filter.
3. **Newborn boys + girls under existing `baby_shower`.** "Blessed Newborn" (pink, existing), "Little Prince" (#9, blue), and "Little Princess" (#10, pink carousel) all live under `baby_shower`. Pictograms differentiate them visually.
4. **Women's engagement (#8) under existing `engagement`.** Adding "Pearl Promise" alongside "Pure Promise" (existing) gives both flavours under one category.
5. **General-event cards encode their *occasion* via `nameEn`/`nameAr` and default `guestMessage`.** The single `general_event` category stays broad (Eid al-Adha, Ramadan/Eid al-Fitr, Hajj/Umrah, family gatherings…) — host's chosen card visually conveys the occasion.
6. **Frame variants 0٤ vs 0٥ stay as separate templates.** Same geometry but inverted colour scheme; different default `primaryColor` so the host can drop their palette into either context.
7. **Form-only fields are forbidden.** Every field must have a canvas overlay or it doesn't ship. See §3 final bullet — this trimmed the field set on §6.9, §6.10, and §6.13 vs the initial draft.

Final execution order (after user signs off): **create 2 new categories → run sibling seed script → eyeball verify → optional layout-update pass.**

## 5. Per-image safe-zone map

All numbers are percentages of the natural image height/width (top is 0%, bottom 100%).

| # | File (short) | Decorative top | Decorative bottom | Decorative sides | Recommended text zone |
|---|---|---|---|---|---|
| 1 | wedding_navy_frame | 0–8% (frame border + small white tag) | 90–100% (frame border) | 0–8% L+R (frame border) | **18–88%** — light cream/gold text on navy |
| 2 | wedding_white_frame | 0–8% (frame border + small navy tag) | 90–100% (frame border) | 0–8% L+R (frame border) | **18–88%** — navy text on white |
| 3 | wedding_navy_dawah | 0–18% (frame + "دعوة" calligraphy in tag) | 90–100% | 0–8% L+R | **22–88%** — light cream/gold text on navy |
| 4 | wedding_white_dawah | 0–18% (frame + "دعوة" calligraphy in tag) | 90–100% | 0–8% L+R | **22–88%** — navy text on white |
| 5 | wedding_gulf_groom | 0–48% (groom in thobe centred top) | 92–100% (gold calligraphy band) | clear | **52–90%** — dark text on white, gold accents |
| 6 | marriage_contract_arch | 0–8% (faint arch line) | 78–98% (large faded calligraphy) | clear | **12–74%** |
| 7 | marriage_contract_bronze | 0–18% (brown peonies top-left) | 82–100% (brown peonies bottom-right) | minor | **22–78%** |
| 8 | engagement_pearl | clear | 60–100% (pearl peonies bottom-right rising centre) | 50–100% L (peonies climb left) | **6–58%** |
| 9 | newborn_boy | 0–14% (small ribbon-bow + minor florals top) | 60–100% (cradle + dense florals + butterfly) | 0–22% L+R (climbing florals) | **18–58%** |
| 10 | newborn_girl | 0–22% (chandelier ribbon swag top) | 65–100% (carousel + carriages) | 0–14% L+R (carriage edges) | **26–62%** |
| 11 | general_spring | 0–18% (small butterfly top-left) | 60–100% (lambs + cosmos flowers) | 0–18% L+R (cosmos climbing) | **22–58%** |
| 12 | general_lantern | 0–24% (3 lanterns + crescent centred-right) | 78–100% (mandala bottom-right) | 0–18% L (mandala faded), 0–22% R | **28–76%** |
| 13 | general_pilgrimage | 0–8% (white frame curve) | 36–100% (architecture + crowd + Ka'aba) | minor | **12–34%** *(narrow zone — minimise field count, see §6.13)* |
| 14 | conference | clear | clear | 55–100% R (man's silhouette) | **8–88%** of LEFT half (centre-aligned, `leftPct` ≤ 38%, `widthPct` ≤ 60%) |

## 6. Per-template specification

> Conventions identical to `TEMPLATES_SEED_6_PLAN.md` §6:
> - `key` = camelCase field key reused by overlays
> - `T` = field type (`txt|tex|dat|tim|col|fnt|num`)
> - `req` = required (Y/N)
> - All overlays use `textAlign: center`, `colorBinding: primary` unless noted (`custom` colour goes in the `color` column)
> - Decoration `source` = lucide name from §3's ICON_MAP list
> - **Every content field listed below has a corresponding overlay** (form-only fields are forbidden — §4 #7). The two meta fields (`primaryColor`, `fontFamily`) are model-side configuration, not text fields, and don't need overlays.

> Sort-order convention: this wave continues from the previous wave's max (50). Use `sortOrder` 60+ for category-internal ordering, except where the new card is meant to be the lead thumbnail.

### 6.1 wedding_navy_frame.jpg → "Royal Navy Wedding" / "الفرح الملكي"

Tone: formal, Gulf-style men's wedding. Navy interior — **every overlay must use `colorBinding: custom` with `#e8d3a0` cream-gold** so the host's primary colour can't paint text invisible.

`nameEn = "Royal Navy Wedding"`, `nameAr = "الفرح الملكي"`. Categories: `[wedding]`. SortOrder: 12. Active: true.

Fields:

| key | T | labelEn / labelAr | placeholder | req | default |
|---|---|---|---|---|---|
| invitationHeader | txt | Header / `العنوان` | e.g. "دعوة" | N | `دعوة` |
| groomFamilyName | txt | Groom Family / `عائلة العريس` | e.g. آل سعود | Y | — |
| groomName | txt | Groom Name / `اسم العريس` | optional | N | — |
| eventDate | dat | Wedding Date / `تاريخ الزفاف` | — | Y | — |
| eventTime | tim | Time / `الوقت` | — | Y | 20:30 |
| venue | txt | Venue / `المكان` | e.g. الرياض، قاعة هيلتون | Y | — |
| invitationMessage | tex | Invitation Message / `رسالة الدعوة` | rows=3 | N | "يتشرف بدعوتكم لحضور حفل زفافه" |
| primaryColor | col | Accent / `لون مميز` | — | N | `#e8d3a0` |
| fontFamily | fnt | Font / `الخط` | — | N | `'Amiri', serif` |

Overlays (all `colorBinding: custom`, `color: #e8d3a0`, `fontFamily: 'Amiri', serif`):

| fieldKey | top% | left% | width% | fontVh | weight |
|---|---|---|---|---|---|
| invitationHeader | 14 | 50 | 50 | 4.0 | 700 |
| invitationMessage | 28 | 50 | 70 | 2.6 | 400 |
| groomFamilyName | 42 | 50 | 70 | 6.0 | 700 |
| groomName | 54 | 50 | 60 | 4.0 | 500 |
| eventDate | 66 | 50 | 60 | 3.2 | 500 |
| eventTime | 72 | 50 | 60 | 2.8 | 400 |
| venue | 80 | 50 | 80 | 2.6 | 400 |

Decorations:

| source | colour | top% | left% | width% | iconVh |
|---|---|---|---|---|---|
| Sparkle | #e8d3a0 | 36 | 30 | 4 | 2.2 |
| Sparkle | #e8d3a0 | 36 | 70 | 4 | 2.2 |
| MoonStar | #e8d3a0 | 88 | 50 | 5 | 3.0 |

### 6.2 wedding_white_frame.jpg → "Pearl Frame Wedding" / "فرح اللآلئ"

Tone: clean, elegant, "white-side" twin of #6.1. White interior — overlays use `colorBinding: primary` and the default `primaryColor` is the navy `#1f3b5e`.

`nameEn = "Pearl Frame Wedding"`, `nameAr = "فرح اللآلئ"`. Categories: `[wedding]`. SortOrder: 13. Active: true.

Fields: identical to §6.1, but `primaryColor` defaults to `#1f3b5e`.

Overlays (`colorBinding: primary`, font `'Amiri', serif`) — same percent positions as §6.1.

Decorations (`color: #1f3b5e`):

| source | colour | top% | left% | width% | iconVh |
|---|---|---|---|---|---|
| Sparkle | #1f3b5e | 36 | 30 | 4 | 2.2 |
| Sparkle | #1f3b5e | 36 | 70 | 4 | 2.2 |
| MoonStar | #1f3b5e | 88 | 50 | 5 | 3.0 |

### 6.3 wedding_navy_dawah.jpg → "Royal Da'wah Wedding" / "دعوة الفرح الملكي"

Same skeleton as §6.1 but the image already contains a "دعوة" calligraphy in the top tag — drop the `invitationHeader` field/overlay entirely and shift remaining overlays up.

`nameEn = "Royal Da'wah Wedding"`, `nameAr = "دعوة الفرح الملكي"`. Categories: `[wedding]`. SortOrder: 14. Active: true.

Fields: §6.1 minus `invitationHeader` (8 fields total — 6 content + 2 meta).

Overlays (`colorBinding: custom`, `color: #e8d3a0`, font `'Amiri', serif`):

| fieldKey | top% | left% | width% | fontVh | weight |
|---|---|---|---|---|---|
| invitationMessage | 26 | 50 | 70 | 2.6 | 400 |
| groomFamilyName | 40 | 50 | 70 | 6.0 | 700 |
| groomName | 52 | 50 | 60 | 4.0 | 500 |
| eventDate | 64 | 50 | 60 | 3.2 | 500 |
| eventTime | 70 | 50 | 60 | 2.8 | 400 |
| venue | 78 | 50 | 80 | 2.6 | 400 |

Decorations: `Sparkle` pair `(34, 30)` and `(34, 70)` width `4` iconVh `2.2`; `MoonStar` `(86, 50)` width `5` iconVh `3.0`. All `#e8d3a0`.

### 6.4 wedding_white_dawah.jpg → "Pearl Da'wah Wedding" / "دعوة الفرح اللؤلؤية"

White-side twin of §6.3. Same overlay set with `colorBinding: primary` and default `primaryColor = #1f3b5e`. Decorations recoloured `#1f3b5e`.

`nameEn = "Pearl Da'wah Wedding"`, `nameAr = "دعوة الفرح اللؤلؤية"`. Categories: `[wedding]`. SortOrder: 15. Active: true.

### 6.5 wedding_gulf_groom.jpg → "Gulf Groom" / "زفاف الخليج"

Tone: portrait of groom in thobe + gold calligraphy band. Text zone is the lower 52–90% white area. Cream-gold accent + Amiri to harmonise with the gold band.

`nameEn = "Gulf Groom"`, `nameAr = "زفاف الخليج"`. Categories: `[wedding]`. SortOrder: 16. Active: true.

Fields:

| key | T | labelEn / labelAr | placeholder | req | default |
|---|---|---|---|---|---|
| groomFamilyName | txt | Groom Family / `عائلة العريس` | e.g. الزهراني | Y | — |
| groomName | txt | Groom Name / `اسم العريس` | — | Y | — |
| eventDate | dat | Wedding Date / `تاريخ الزفاف` | — | Y | — |
| eventTime | tim | Time / `الوقت` | — | Y | 20:30 |
| venue | txt | Venue / `المكان` | — | Y | — |
| invitationMessage | tex | Invitation Message / `رسالة الدعوة` | rows=2 | N | "يتشرف بدعوتكم لحضور حفل زفافه" |
| primaryColor | col | Accent / `لون مميز` | — | N | `#a47148` |
| fontFamily | fnt | Font / `الخط` | — | N | `'Amiri', serif` |

Overlays (`colorBinding: primary`, font `'Amiri', serif`):

| fieldKey | top% | left% | width% | fontVh | weight |
|---|---|---|---|---|---|
| invitationMessage | 56 | 50 | 70 | 2.6 | 400 |
| groomFamilyName | 64 | 50 | 70 | 5.5 | 700 |
| groomName | 73 | 50 | 60 | 4.0 | 500 |
| eventDate | 80 | 50 | 60 | 3.0 | 500 |
| eventTime | 84 | 50 | 60 | 2.6 | 400 |
| venue | 88 | 50 | 80 | 2.4 | 400 |

Decorations:

| source | colour | top% | left% | width% | iconVh |
|---|---|---|---|---|---|
| Sparkle | #a47148 | 53 | 30 | 4 | 2.2 |
| Sparkle | #a47148 | 53 | 70 | 4 | 2.2 |

### 6.6 marriage_contract_arch.jpg → "Sacred Vows" / "عقد قران مبارك"

Tone: religious, white minimalist, calligraphic. The grey "أفراحنا" calligraphy is a fixed decoration of the image — no overlay sits on top of it.

`nameEn = "Sacred Vows"`, `nameAr = "عقد قران مبارك"`. Categories: `[wedding]`. SortOrder: 17. Active: true.

Fields:

| key | T | labelEn / labelAr | placeholder | req | default |
|---|---|---|---|---|---|
| openingVerse | txt | Opening Verse / `الآية` | — | N | `وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا` |
| groomName | txt | Groom Name / `اسم العريس` | — | Y | — |
| brideName | txt | Bride Name / `اسم العروسة` | — | Y | — |
| brideFatherName | txt | Bride's Father / `والد العروسة` | optional | N | — |
| eventDate | dat | Contract Date / `تاريخ العقد` | — | Y | — |
| eventTime | tim | Time / `الوقت` | — | Y | 19:30 |
| venue | txt | Venue / `المكان` | e.g. مسجد ، بيت العائلة | Y | — |
| primaryColor | col | Accent / `لون مميز` | — | N | `#7e6c45` |
| fontFamily | fnt | Font / `الخط` | — | N | `'Amiri', serif` |

Overlays (`colorBinding: primary`, font `'Amiri', serif`):

| fieldKey | top% | left% | width% | fontVh | weight |
|---|---|---|---|---|---|
| openingVerse | 14 | 50 | 78 | 2.4 | 500 |
| groomName | 28 | 50 | 70 | 5.0 | 700 |
| brideName | 40 | 50 | 70 | 5.0 | 700 |
| brideFatherName | 50 | 50 | 70 | 2.6 | 500 |
| eventDate | 58 | 50 | 60 | 3.0 | 500 |
| eventTime | 64 | 50 | 60 | 2.6 | 400 |
| venue | 70 | 50 | 75 | 2.6 | 500 |

Decorations:

| source | colour | top% | left% | width% | iconVh |
|---|---|---|---|---|---|
| MoonStar | #7e6c45 | 22 | 50 | 4 | 2.6 |
| Sparkle | #7e6c45 | 35 | 25 | 3 | 1.8 |
| Sparkle | #7e6c45 | 35 | 75 | 3 | 1.8 |

### 6.7 marriage_contract_bronze.jpg → "Bronze Bloom Vows" / "عقد قران الورد"

Tone: warm, romantic-religious. Brown peonies in two corners — text zone is the centre column.

`nameEn = "Bronze Bloom Vows"`, `nameAr = "عقد قران الورد"`. Categories: `[wedding]`. SortOrder: 18. Active: true.

Fields: identical to §6.6 with `primaryColor` default `#6b4423`.

Overlays (`colorBinding: primary`, font `'Amiri', serif`):

| fieldKey | top% | left% | width% | fontVh | weight |
|---|---|---|---|---|---|
| openingVerse | 24 | 50 | 70 | 2.4 | 500 |
| groomName | 36 | 50 | 70 | 5.0 | 700 |
| brideName | 47 | 50 | 70 | 5.0 | 700 |
| brideFatherName | 56 | 50 | 70 | 2.6 | 500 |
| eventDate | 63 | 50 | 60 | 3.0 | 500 |
| eventTime | 68 | 50 | 60 | 2.6 | 400 |
| venue | 74 | 50 | 75 | 2.6 | 500 |

Decorations:

| source | colour | top% | left% | width% | iconVh |
|---|---|---|---|---|---|
| Sparkle | #6b4423 | 32 | 50 | 3 | 2.0 |
| MoonStar | #6b4423 | 79 | 50 | 4 | 2.6 |

### 6.8 engagement_pearl.jpg → "Pearl Promise" / "خطوبة لؤلؤية"

Tone: refined, women-side engagement. Pearl-peonies climb the bottom-left → centre — text zone is upper 6–58%.

`nameEn = "Pearl Promise"`, `nameAr = "خطوبة لؤلؤية"`. Categories: `[engagement]`. SortOrder: 60. Active: true.

Fields:

| key | T | labelEn / labelAr | placeholder | req | default |
|---|---|---|---|---|---|
| brideName | txt | Bride Name / `اسم العروس` | — | Y | — |
| brideFamilyName | txt | Bride Family / `عائلة العروس` | optional | N | — |
| hostessName | txt | Hostess / `المضيفة` | e.g. أم سارة | N | — |
| engagementDate | dat | Engagement Date / `تاريخ الخطوبة` | — | Y | — |
| engagementTime | tim | Time / `الوقت` | — | Y | 18:30 |
| venue | txt | Venue / `المكان` | — | Y | — |
| invitationMessage | tex | Invitation Message / `رسالة الدعوة` | rows=2 | N | "يسرّها مشاركتكنّ فرحة خطبتها" |
| primaryColor | col | Accent / `لون مميز` | — | N | `#a08a6f` |
| fontFamily | fnt | Font / `الخط` | — | N | `'Amiri', serif` |

Overlays (`colorBinding: primary`, font `'Amiri', serif`):

| fieldKey | top% | left% | width% | fontVh | weight |
|---|---|---|---|---|---|
| invitationMessage | 10 | 50 | 70 | 2.4 | 400 |
| brideName | 20 | 50 | 70 | 5.5 | 700 |
| brideFamilyName | 31 | 50 | 60 | 3.2 | 500 |
| hostessName | 38 | 50 | 60 | 2.8 | 400 |
| engagementDate | 46 | 50 | 60 | 3.0 | 500 |
| engagementTime | 51 | 50 | 60 | 2.6 | 400 |
| venue | 56 | 50 | 75 | 2.4 | 500 |

Decorations:

| source | colour | top% | left% | width% | iconVh |
|---|---|---|---|---|---|
| Diamond | #a08a6f | 16 | 50 | 4 | 2.6 |
| Sparkle | #a08a6f | 25 | 28 | 3 | 1.8 |
| Sparkle | #a08a6f | 25 | 72 | 3 | 1.8 |

### 6.9 newborn_boy.jpg → "Little Prince" / "بشارة المولود"

Tone: blue baby-boy, cradle motif. Top has small ribbon-bow, bottom has cradle + dense florals — text zone 18–58%.

**Field/overlay parity rule (§4 #7):** the original draft included `eventTime`, `venue`, and `eventDate` for a possible reception. None of those have overlays in the safe zone, so they're dropped. This is a **pure announcement card** — date of birth + weight are the only "stats" overlaid.

`nameEn = "Little Prince"`, `nameAr = "بشارة المولود"`. Categories: `[baby_shower]`. SortOrder: 60. Active: true.

Fields (7 — every content field has an overlay below):

| key | T | labelEn / labelAr | placeholder | req | default |
|---|---|---|---|---|---|
| announcement | txt | Announcement / `البشارة` | — | N | `بشارة` |
| babyName | txt | Baby Name / `اسم المولود` | — | N | — |
| parents | txt | Parents / `الوالدان` | e.g. أحمد وريم | Y | — |
| birthDate | dat | Birth Date / `تاريخ الولادة` | — | N | — |
| weight | num | Weight (kg) / `الوزن (كجم)` | step=0.01 min=0.5 max=10 | N | — |
| guestMessage | tex | Message / `رسالة` | rows=2 | N | "أهلاً وسهلاً بأمير العائلة الجديد" |
| primaryColor | col | Primary Colour / `اللون` | — | N | `#5a7ca8` |
| fontFamily | fnt | Font / `الخط` | — | N | `'Cairo', sans-serif` |

Overlays (`colorBinding: primary`, font `'Cairo', sans-serif`):

| fieldKey | top% | left% | width% | fontVh | weight |
|---|---|---|---|---|---|
| announcement | 18 | 50 | 50 | 3.6 | 700 |
| guestMessage | 24 | 50 | 70 | 2.4 | 400 |
| babyName | 32 | 50 | 70 | 6.0 | 700 |
| parents | 42 | 50 | 70 | 2.8 | 500 |
| birthDate | 50 | 50 | 60 | 2.6 | 400 |
| weight | 56 | 50 | 60 | 2.4 | 400 |

Decorations:

| source | colour | top% | left% | width% | iconVh |
|---|---|---|---|---|---|
| HeartPulse | #5a7ca8 | 28 | 50 | 4 | 2.6 |
| Sparkle | #5a7ca8 | 38 | 28 | 3 | 1.8 |
| Sparkle | #5a7ca8 | 38 | 72 | 3 | 1.8 |

### 6.10 newborn_girl.jpg → "Little Princess" / "بشارة الأميرة"

Tone: pink baby-girl, carousel motif. Chandelier ribbon swag occupies top 0–22%; carousel + carriages 65–100%; text zone 26–62%.

Same field/overlay parity rule applied — `eventDate`, `eventTime`, `venue` dropped relative to draft. Pure announcement card.

`nameEn = "Little Princess"`, `nameAr = "بشارة الأميرة"`. Categories: `[baby_shower]`. SortOrder: 61. Active: true.

Fields: identical schema to §6.9 with `primaryColor` default `#d9a4b8`, `guestMessage` default `"أهلاً وسهلاً بأميرة العائلة الجديدة"`.

Overlays (`colorBinding: primary`, font `'Cairo', sans-serif`):

| fieldKey | top% | left% | width% | fontVh | weight |
|---|---|---|---|---|---|
| announcement | 28 | 50 | 50 | 3.4 | 700 |
| guestMessage | 34 | 50 | 70 | 2.4 | 400 |
| babyName | 42 | 50 | 70 | 5.5 | 700 |
| parents | 50 | 50 | 70 | 2.6 | 500 |
| birthDate | 56 | 50 | 60 | 2.4 | 400 |
| weight | 60 | 50 | 60 | 2.2 | 400 |

Decorations:

| source | colour | top% | left% | width% | iconVh |
|---|---|---|---|---|---|
| Crown | #d9a4b8 | 32 | 50 | 5 | 3.0 |
| Sparkle | #d9a4b8 | 47 | 22 | 3 | 1.8 |
| Sparkle | #d9a4b8 | 47 | 78 | 3 | 1.8 |

### 6.11 general_spring.jpg → "Spring Meadow" / "ربيع المناسبات"

Tone: pastel, watercolour, Eid al-Adha-friendly via the lamb motif. Generic field set so the host can repurpose for any spring/Eid gathering.

`nameEn = "Spring Meadow"`, `nameAr = "ربيع المناسبات"`. Categories: `[general_event]`. SortOrder: 10. Active: true.

Fields:

| key | T | labelEn / labelAr | placeholder | req | default |
|---|---|---|---|---|---|
| eventTitle | txt | Event Title / `عنوان المناسبة` | e.g. تجمع العيد | Y | — |
| hostName | txt | Host / `المضيف` | optional | N | — |
| eventDate | dat | Date / `التاريخ` | — | Y | — |
| eventTime | tim | Time / `الوقت` | — | Y | 17:00 |
| venue | txt | Venue / `المكان` | — | Y | — |
| guestMessage | tex | Message / `رسالة` | rows=3 | N | "كل عام وأنتم بخير" |
| primaryColor | col | Primary Colour / `اللون` | — | N | `#7c8eaa` |
| fontFamily | fnt | Font / `الخط` | — | N | `'Cairo', sans-serif` |

Overlays (`colorBinding: primary`, font `'Cairo', sans-serif`):

| fieldKey | top% | left% | width% | fontVh | weight |
|---|---|---|---|---|---|
| guestMessage | 24 | 50 | 70 | 2.4 | 400 |
| eventTitle | 32 | 50 | 70 | 4.6 | 700 |
| hostName | 41 | 50 | 60 | 2.6 | 500 |
| eventDate | 47 | 50 | 60 | 3.0 | 500 |
| eventTime | 52 | 50 | 60 | 2.6 | 400 |
| venue | 56 | 50 | 75 | 2.4 | 500 |

Decorations:

| source | colour | top% | left% | width% | iconVh |
|---|---|---|---|---|---|
| Sparkle | #7c8eaa | 28 | 50 | 4 | 2.4 |

### 6.12 general_lantern.jpg → "Lantern Night" / "ليلة الفوانيس"

Tone: warm Ramadan/Eid al-Fitr feel. Lanterns + crescent occupy top 0–24%; mandala bottom-right; text zone 28–76%.

`nameEn = "Lantern Night"`, `nameAr = "ليلة الفوانيس"`. Categories: `[general_event]`. SortOrder: 11. Active: true.

Fields: same schema as §6.11 with `guestMessage` default `"رمضان كريم — يسعدنا حضوركم"`, `primaryColor` default `#a47148`, `fontFamily` `'Amiri', serif`.

Overlays — **`colorBinding: custom` + `color: #a47148`** (per §4 dark-bg rule the user accepted: light cream text on the darker artwork zones). Actually the cream paper here is light, so we keep `colorBinding: primary` and just default `primaryColor` to copper. The override-protection only matters when the background is dark. For this card we leave it `primary`.

| fieldKey | top% | left% | width% | fontVh | weight |
|---|---|---|---|---|---|
| guestMessage | 30 | 50 | 70 | 2.6 | 400 |
| eventTitle | 40 | 50 | 70 | 5.0 | 700 |
| hostName | 50 | 50 | 60 | 2.8 | 500 |
| eventDate | 58 | 50 | 60 | 3.0 | 500 |
| eventTime | 63 | 50 | 60 | 2.6 | 400 |
| venue | 68 | 50 | 75 | 2.4 | 500 |

Decorations:

| source | colour | top% | left% | width% | iconVh |
|---|---|---|---|---|---|
| Stars | #a47148 | 34 | 50 | 4 | 2.4 |
| Sparkle | #a47148 | 73 | 28 | 3 | 1.8 |
| Sparkle | #a47148 | 73 | 72 | 3 | 1.8 |

### 6.13 general_pilgrimage.jpg → "Sacred Pilgrimage" / "بشارة الحج"

Tone: solemn, photographic. Hajj/Umrah-leaning. The image already contains a green text band at ~38% and a smaller one near the bottom — but we don't paint over either band (they look like decorative graphics, not text frames). The only safe text zone is **12–34%** above the architecture.

**Field set deliberately small** per §4 #7 — only fields that fit on the canvas exist. Earlier draft had `returnDate`, `venue`, `guestMessage`; all dropped because there's no overlay space for them.

`nameEn = "Sacred Pilgrimage"`, `nameAr = "بشارة الحج"`. Categories: `[general_event]`. SortOrder: 12. Active: true.

Fields (4 content + 2 meta — every content field overlaid):

| key | T | labelEn / labelAr | placeholder | req | default |
|---|---|---|---|---|---|
| announcement | txt | Announcement / `البشارة` | — | N | `بشارة الحج` |
| pilgrimName | txt | Pilgrim / `الحاج` | e.g. أبو محمد | Y | — |
| eventDate | dat | Reception Date / `تاريخ الاستقبال` | — | N | — |
| eventTime | tim | Time / `الوقت` | — | N | 19:00 |
| primaryColor | col | Primary Colour / `اللون` | — | N | `#0d3a2d` |
| fontFamily | fnt | Font / `الخط` | — | N | `'Amiri', serif` |

Overlays (`colorBinding: primary`, font `'Amiri', serif`) — packed into the 12–34% upper safe zone:

| fieldKey | top% | left% | width% | fontVh | weight |
|---|---|---|---|---|---|
| announcement | 14 | 50 | 60 | 4.4 | 700 |
| pilgrimName | 22 | 50 | 70 | 4.0 | 600 |
| eventDate | 28 | 50 | 60 | 2.4 | 500 |
| eventTime | 32 | 50 | 60 | 2.2 | 400 |

Decorations: minimal — `Sparkle` `(11, 30)` and `(11, 70)` width `3` iconVh `1.6`, colour `#0d3a2d`.

### 6.14 conference.jpg → "Visionary Conference" / "مؤتمر القادة"

Tone: corporate-modern, dark-blue/neon, one figure on the right. **Text MUST stay in the LEFT half** — `leftPct ≤ 38`, `widthPct ≤ 60`. Cream-gold custom colour to read on the dark blue.

`nameEn = "Visionary Conference"`, `nameAr = "مؤتمر القادة"`. Categories: `[conference]`. SortOrder: 10. Active: true.

Fields:

| key | T | labelEn / labelAr | placeholder | req | default |
|---|---|---|---|---|---|
| conferenceTitle | txt | Conference Title / `عنوان المؤتمر` | e.g. مؤتمر القيادة | Y | — |
| organizerName | txt | Organizer / `الجهة المنظمة` | optional | N | — |
| keynoteSpeaker | txt | Keynote Speaker / `المتحدث الرئيسي` | optional | N | — |
| eventDate | dat | Date / `التاريخ` | — | Y | — |
| eventTime | tim | Time / `الوقت` | — | Y | 09:00 |
| venue | txt | Venue / `المكان` | e.g. الرياض، فندق الفيصلية | Y | — |
| registrationUrl | txt | Registration URL / `رابط التسجيل` | optional | N | — |
| guestMessage | tex | Welcome Message / `رسالة الترحيب` | rows=2 | N | "نتشرف بدعوتكم لحضور المؤتمر" |
| primaryColor | col | Accent / `لون مميز` | — | N | `#e8d3a0` |
| fontFamily | fnt | Font / `الخط` | — | N | `'Cairo', sans-serif` |

Overlays (`colorBinding: custom`, `color: #e8d3a0`, font `'Cairo', sans-serif`, all `textAlign: center` but laid out in left column — `leftPct ≤ 38`):

| fieldKey | top% | left% | width% | fontVh | weight |
|---|---|---|---|---|---|
| guestMessage | 18 | 28 | 50 | 2.4 | 400 |
| conferenceTitle | 28 | 28 | 56 | 4.6 | 700 |
| keynoteSpeaker | 42 | 28 | 50 | 2.8 | 500 |
| organizerName | 48 | 28 | 50 | 2.4 | 400 |
| eventDate | 58 | 28 | 50 | 3.0 | 500 |
| eventTime | 64 | 28 | 50 | 2.6 | 400 |
| venue | 70 | 28 | 56 | 2.4 | 500 |
| registrationUrl | 78 | 28 | 56 | 2.0 | 400 |

Decorations:

| source | colour | top% | left% | width% | iconVh |
|---|---|---|---|---|---|
| Sparkle | #e8d3a0 | 22 | 16 | 3 | 1.8 |
| Sparkle | #e8d3a0 | 22 | 40 | 3 | 1.8 |
| Mic2 | #e8d3a0 | 38 | 28 | 4 | 2.6 |

## 7. Execution sequence

Sibling script — `scripts/seedTemplateCardsWave2.js` — keeps wave 1 untouched and lets us re-run / iterate independently. It reuses `templates.service.handleImageUpload` + `service.createTemplate` (same code path the editor hits) and the same idempotency-by-`nameEn`.

1. **Categories** — script ensures the 2 new categories first:
   ```js
   { code: "general_event", nameEn: "General Event", nameAr: "مناسبات عامة", sortOrder: 60 }
   { code: "conference",    nameEn: "Conference",    nameAr: "مؤتمر",       sortOrder: 70 }
   ```
   (`wedding`, `engagement`, `baby_shower` already exist from wave 1.)
2. **Templates** — script walks the 14 specs from §6, reads each ASCII-named JPG from `D:\halla\template-cards\new\`, uploads to S3 via `service.handleImageUpload`, then `service.createTemplate` with the spec's fields/overlays/decorations.
3. **Idempotency** — `Template.findOne({ nameEn })` short-circuits before the upload so re-running the script is free / can't burn S3.
4. **Verification** — script prints per-template overlay/decoration counts and a per-category active count.

Run order:
```sh
node scripts/seedTemplateCardsWave2.js --dry-run
node scripts/seedTemplateCardsWave2.js
```

The dry-run prints what *would* upload + which templates are kept. No DB writes, no S3 writes.

## 8. Acceptance criteria

- 14 new templates exist alongside the 6 existing ones (**20 total active**).
- 2 new categories (`general_event`, `conference`) exist active with correct `sortOrder`. Marriage-contract templates use existing `wedding`.
- Per-category active counts after the seed: **wedding = 9** (Royal Wedding, Garden Wedding from wave 1, plus 5 men's-wedding + 2 marriage-contract from wave 2), **engagement = 2** (Pure Promise, Pearl Promise), **birthday = 1** (Sweet Celebration), **baby_shower = 3** (Blessed Newborn, Little Prince, Little Princess), **ladies_event = 1** (Ladies' Gathering), **general_event = 3** (Spring Meadow, Lantern Night, Sacred Pilgrimage), **conference = 1** (Visionary Conference). Total **20**.
- For each new template:
  - `imageUrl` and `imageS3Key` non-empty.
  - `categories[]` contains exactly the code listed in §2.1.
  - **Every overlay's `fieldKey` exists in `fields[]`, and every content field in `fields[]` has a matching overlay** (no orphans either way).
  - Bilingual labels and placeholders populated where applicable.
  - Overlays sit fully inside the §5 safe zones — eyeball-verify Pearl Promise (#8), Sacred Pilgrimage (#13), and Visionary Conference (#14) because their safe zones are tight or asymmetric.
- Dark-background cards (#1, #3, #5, #14): host changing `primaryColor` does NOT make text disappear — overlays use `colorBinding: custom`.

## 9. Risks & open questions

- **Conference overlays are aggressive on the left half.** The right-side figure occupies 55–100% width; if the natural image dimensions aren't 9:16, manual `leftPct = 28` may need tuning. Verification step: re-pull `naturalWidth`/`naturalHeight` after upload before signing off.
- **5 men's wedding cards is a lot of near-duplicates.** If host feedback shows confusion ("which navy one was that?"), the differentiator names in §6.1–6.5 should be enough to distinguish in the picker — consider trimming to 2 in a future pass.
- **2 marriage-contract cards under `wedding`** mean the wedding filter now has 9 cards. If picker UX feels heavy, the right move is a `marriage_contract` sub-category later (deferred per §4 #1).
- **No `Lantern` icon** in `IconPicker.jsx` — §6.12 lantern card relies on the *image* for the lantern motif; decorations use `Stars` + `Sparkle`. To add a lantern decoration in the future, add `Lamp` (already in lucide-react) to ICON_MAP first.
- **Sacred Pilgrimage has only 4 paintable fields.** The Ka'aba photo dominates 36–100% of the canvas. Hosts who want a richer reception card should pick a different general-event template — Spring Meadow / Lantern Night both carry full 6-field sets.

## 10. Out of scope

- Adding new icons to `IconPicker.jsx`.
- Re-styling the 6 templates from the previous plan.
- Mobile (`halla-mobile/`) parity verification — the same `Template` rows feed both surfaces.
- Splitting `general_event` into per-occasion categories (deferred — see §9).
- Splitting `wedding` into men's / women's / marriage-contract sub-codes (deferred).
