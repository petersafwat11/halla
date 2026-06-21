# Plan — Seed 6 Visual Invitation Templates from `template-cards/`

## 1. Goal

Use the 6 background images in `D:\halla\template-cards\` to create 6 production-ready visual templates via the admin editor at `/ar/admin-dash/templates/new`. Each template gets a sensible category, a complete set of host-facing fields (names, dates, times, venue, message, colour, font…), text overlays positioned over the image's "safe zone" (away from decorative artwork), and tasteful decoration icons.

After this work, a host opening Step Three of `create-event` and filtering by the new categories should see six visually distinct, polished options.

## 2. Inputs

Source images (all 720×1280 portrait, 4:5-ish ratio):

| File | Visual style | Proposed name (EN / AR) | Proposed category |
|---|---|---|---|
| `marriage.jpg` | Dark fabric, Arabic calligraphy watermark, man in traditional thobe | Royal Wedding / `زفاف ملكي` | `wedding` |
| `marriage2.jpg` | Pink-floral arch + dome gazebo, romantic & feminine | Garden Wedding / `زفاف الحديقة` | `wedding` |
| `engament.jpg` | Cream textured paper, white calla lilies along bottom | Pure Promise / `وعدٌ نقي` | `engagement` |
| `birthday.jpg` | Pastel bunting, pink watercolour splash, gift boxes & candle cakes | Sweet Celebration / `احتفال حلو` | `birthday` |
| `blessed_births.jpg` | Pink florals top corners, butterflies, tulip border bottom | Blessed Newborn / `مولود مبارك` | `baby_shower` |
| `woman_invitation.jpg` | Burgundy & blush peonies along bottom, ample white above | Ladies' Gathering / `ملتقى السيدات` | `ladies_event` *(NEW — see §4)* |

## 3. Findings (current state — verified via Playwright + DB read)

- **Stack** — Editor at `labbe/app/[lang]/admin-dash/templates/_components/TemplateEditorPage.jsx` posts to `POST /api/v2/admin/templates` (Express controller in `labbe-backend-/src/modules/templates/templates.controller.js`). `Template` model in `labbe-backend-/models/TemplateModel.js`; categories in `TemplateCategoryModel.js`. Form validates with `templateSchema.js` (zod).
- **Editor data flow** — Image is uploaded via `templatesService.adminUploadImage` (multipart to `/api/v2/admin/templates/upload-image`, ≤5 MB, jpeg/png/webp). `naturalWidth`/`naturalHeight` are auto-detected client-side on upload — **do not pre-bake them in the plan**.
- **Field types available** — `text, textarea, date, time, color, font, number, email, password` (see `FIELD_TYPES` in editor + enum in model).
- **Overlays** — Position is percentage of natural image dimensions (`topPct`, `leftPct`, optional `widthPct`); typography uses `fontSizeVh` (vh of canvas height); colour binds to either `primary` (host-overrideable) or `custom` (fixed hex).
- **Decorations** — Either `icon` (lucide-react name from `IconPicker.jsx` ICON_MAP — e.g. `Heart, Crown, Diamond, Gem, Flower2, Rose, Sparkles, Gift, Cake, PartyPopper, HeartHandshake`) or `image`. Position same percent system; size via `iconSizeVh`.
- **Fonts available** (from `fontRegistry.js`) — `cairo, inter, lato, amiri, ibm_plex_arabic, noto_sans_arabic`. Arabic-capable: cairo, amiri, ibm_plex_arabic, noto_sans_arabic. Stored as `webFamily` on the overlay (e.g. `'Cairo', sans-serif`).
- **Host preview** — `TemplatePreviewCanvas.jsx` renders `decorations` then `overlays` (z-index sorted) over the background. Empty fields fall back to `field.labelEn` so the canvas is never blank.
- **Auth** — Super-admin seed user is `test.superadmin@labbe.sa` / `password123` (from `labbe-backend-/scripts/seedTestUsers.js`).
- **DB state today** — 1 junk category (`code: hhhh`, `nameAr: "تايب"`) and 3 junk templates (`hi`, `testing categories`, `Playwright Test Template`). None of the seed-script categories (`wedding`, `engagement`, `birthday`, `baby_shower`, `general`) exist yet — they must be created before saving any template (model requires `categories.length >= 1`).

## 4. Decisions — locked by user (2026-05-06)

1. **Junk cleanup — DO IT.** Delete the `hhhh` category and the 3 junk templates (`hi`, `testing categories`, `Playwright Test Template`) before any seed work, so the production catalogue starts clean.
2. **New category `ladies_event` — CREATE IT.** Add a 5th category (`code: ladies_event`, EN: `Ladies' Event`, AR: `مناسبة نسائية`, sortOrder 50) for `woman_invitation.jpg`.
3. **Two wedding templates — keep distinct, same category.** `marriage.jpg` (formal "Royal Wedding") and `marriage2.jpg` (romantic "Garden Wedding") both live under the single `wedding` category but ship with intentionally different field sets and tones (see §6.1 vs §6.2).

Final execution order: **cleanup → create 5 categories (wedding, engagement, birthday, baby_shower, ladies_event) → create the 6 templates.**

## 5. Per-image safe-zone map

For each image: where the artwork lives, where text/decorations can go without colliding. All numbers are percentages of natural height/width (top is 0%, bottom 100%).

| File | Decorative top | Decorative bottom | Decorative sides | Recommended text zone (top→bottom) |
|---|---|---|---|---|
| `marriage.jpg` | 0–35% (man + thobe) | clear | calligraphy watermark all over (faded) | **45–95%** (use light cream text — see §6.1) |
| `marriage2.jpg` | 0–18% (floral arch) | 75–100% (gazebo + flower bowls) | 0–35% L+R (arch hangs) | **22–70%** |
| `engament.jpg` | clear | 72–100% (calla lilies) | clear | **6–68%** |
| `birthday.jpg` | 0–18% (bunting + splash) | 72–100% (gift boxes + cakes) | 0–18% L (splash) | **22–68%** |
| `blessed_births.jpg` | 0–25% (flowers L+R, butterfly) | 80–100% (tulip border) | 0–22% L+R top corners | **28–76%** |
| `woman_invitation.jpg` | clear | 70–100% (rose border) | clear | **8–65%** |

These zones drive every overlay/decoration `topPct`/`leftPct` listed in §6.

## 6. Per-template specification

> Conventions used in the tables below
> - `key`: the field key (camelCase, used by overlays & host form)
> - `T` column: field type (`txt|tex|dat|tim|col|fnt|num`)
> - `req`: required Y/N
> - All overlays use `textAlign: center`, `widthPct` ≈ horizontal text box width, `colorBinding: primary` unless noted (custom colour goes in the `color` column)
> - Decorations use lucide icon names from `IconPicker.jsx`

### 6.1 marriage.jpg → "Royal Wedding" / "زفاف ملكي"

Tone: formal, masculine, Gulf-style. Restrained field set; emphasises calligraphic family names. **Dark background — every overlay must use `colorBinding: custom` with a light cream/gold hex so text stays legible regardless of host's primary colour.**

Names: `nameEn = "Royal Wedding"`, `nameAr = "زفاف ملكي"`. Categories: `[wedding]`. SortOrder: 10. Active: true.

Fields:

| key | T | labelEn / labelAr | placeholder (EN) | req | default |
|---|---|---|---|---|---|
| groomFamilyName | txt | Groom Family / `عائلة العريس` | e.g. Al-Qahtani | Y | — |
| brideFamilyName | txt | Bride Family / `عائلة العروس` | e.g. Al-Qahtani | Y | — |
| eventDate | dat | Wedding Date / `تاريخ الزفاف` | — | Y | — |
| eventTime | tim | Time / `الوقت` | — | Y | 20:00 |
| venue | txt | Venue / `المكان` | Riyadh, Hilton Hall | Y | — |
| invitationMessage | tex | Invitation Message / `رسالة الدعوة` | rows=3 | N | "يتشرف بدعوتكم لحضور حفل زفافهما" |
| primaryColor | col | Accent Colour / `لون مميز` | — | N | `#e8d3a0` |
| fontFamily | fnt | Font / `الخط` | — | N | `'Amiri', serif` |

Overlays (all `colorBinding: custom`, `color: #e8d3a0` cream-gold; `fontFamily: 'Amiri', serif`):

| fieldKey | top% | left% | width% | fontVh | weight | notes |
|---|---|---|---|---|---|---|
| groomFamilyName | 52 | 50 | 70 | 5.5 | 700 | — |
| brideFamilyName | 62 | 50 | 70 | 5.5 | 700 | — |
| eventDate | 75 | 50 | 60 | 3.2 | 500 | — |
| eventTime | 80 | 50 | 60 | 3.0 | 400 | — |
| venue | 86 | 50 | 80 | 2.8 | 400 | — |
| invitationMessage | 92 | 50 | 80 | 2.4 | 400 | — |

Decorations:

| type | source | colour | top% | left% | width% | iconVh | z |
|---|---|---|---|---|---|---|---|
| icon | Sparkles | #e8d3a0 | 47 | 50 | 6 | 3.2 | 1 |
| icon | Crown | #e8d3a0 | 41 | 50 | 8 | 4.5 | 1 |

### 6.2 marriage2.jpg → "Garden Wedding" / "زفاف الحديقة"

Tone: feminine, romantic, RSVP-driven, more personal. Larger field set than 6.1 to differentiate the two wedding templates.

Names: `nameEn = "Garden Wedding"`, `nameAr = "زفاف الحديقة"`. Categories: `[wedding]`. SortOrder: 11. Active: true.

Fields:

| key | T | labelEn / labelAr | placeholder | req | default |
|---|---|---|---|---|---|
| brideName | txt | Bride / `العروس` | e.g. سارة | Y | — |
| groomName | txt | Groom / `العريس` | e.g. خالد | Y | — |
| weddingDate | dat | Wedding Date / `تاريخ الزفاف` | — | Y | — |
| weddingTime | tim | Time / `الوقت` | — | Y | 19:00 |
| venue | txt | Venue / `القاعة` | Riyadh, Four Seasons | Y | — |
| address | tex | Address / `العنوان` | rows=2 | N | — |
| rsvpDate | dat | RSVP By / `تأكيد الحضور قبل` | — | N | — |
| hashtag | txt | Hashtag / `وسم` | #SaraAndKhaled | N | — |
| guestMessage | tex | Message to Guests / `رسالة للضيوف` | rows=3 | N | "بكل حب ندعوكم لمشاركتنا فرحتنا" |
| primaryColor | col | Primary Colour / `اللون الأساسي` | — | N | `#b56576` |
| fontFamily | fnt | Font / `الخط` | — | N | `'Cairo', sans-serif` |

Overlays (`colorBinding: primary` so host accent flows through; `fontFamily: 'Cairo', sans-serif` unless noted):

| fieldKey | top% | left% | width% | fontVh | weight |
|---|---|---|---|---|---|
| guestMessage | 22 | 50 | 70 | 2.6 | 400 |
| brideName | 30 | 50 | 60 | 5.0 | 700 |
| groomName | 41 | 50 | 60 | 5.0 | 700 |
| weddingDate | 51 | 50 | 60 | 3.0 | 500 |
| weddingTime | 56 | 50 | 60 | 2.8 | 400 |
| venue | 61 | 50 | 75 | 2.6 | 500 |
| address | 65 | 50 | 75 | 2.2 | 400 |
| rsvpDate | 70 | 50 | 60 | 2.2 | 400 |
| hashtag | 73 | 50 | 60 | 2.2 | 600 |

Decorations:

| type | source | colour | top% | left% | width% | iconVh | z |
|---|---|---|---|---|---|---|---|
| icon | HeartHandshake | (primary binding via `color` empty + custom hex `#b56576`) | 36 | 50 | 5 | 3.5 | 1 |

### 6.3 engament.jpg → "Pure Promise" / "وعدٌ نقي"

Tone: minimal, elegant. Lots of empty top, calla lilies bottom.

Names: `nameEn = "Pure Promise"`, `nameAr = "وعدٌ نقي"`. Categories: `[engagement]`. SortOrder: 20. Active: true.

Fields:

| key | T | labelEn / labelAr | placeholder | req | default |
|---|---|---|---|---|---|
| hisName | txt | His Name / `اسمه` | — | Y | — |
| herName | txt | Her Name / `اسمها` | — | Y | — |
| engagementDate | dat | Engagement Date / `تاريخ الخطوبة` | — | Y | — |
| engagementTime | tim | Time / `الوقت` | — | Y | 19:00 |
| venue | txt | Venue / `المكان` | — | Y | — |
| invitationMessage | tex | Invitation Message / `رسالة الدعوة` | rows=2 | N | "يتشرفان بدعوتكم لحفل خطوبتهما" |
| primaryColor | col | Accent / `اللون` | — | N | `#88775f` |
| fontFamily | fnt | Font / `الخط` | — | N | `'Amiri', serif` |

Overlays (`colorBinding: primary`):

| fieldKey | top% | left% | width% | fontVh | weight |
|---|---|---|---|---|---|
| invitationMessage | 14 | 50 | 70 | 2.4 | 400 |
| hisName | 25 | 50 | 60 | 5.5 | 700 |
| herName | 38 | 50 | 60 | 5.5 | 700 |
| engagementDate | 52 | 50 | 60 | 3.0 | 500 |
| engagementTime | 58 | 50 | 60 | 2.8 | 400 |
| venue | 64 | 50 | 75 | 2.6 | 500 |

Decorations:

| type | source | colour | top% | left% | width% | iconVh | z |
|---|---|---|---|---|---|---|---|
| icon | Diamond | #c9a36b | 32 | 50 | 5 | 3.0 | 1 |
| icon | Sparkle | #c9a36b | 32 | 30 | 4 | 2.0 | 1 |
| icon | Sparkle | #c9a36b | 32 | 70 | 4 | 2.0 | 1 |

### 6.4 birthday.jpg → "Sweet Celebration" / "احتفال حلو"

Tone: cheerful, candy-pink, kid-friendly.

Names: `nameEn = "Sweet Celebration"`, `nameAr = "احتفال حلو"`. Categories: `[birthday]`. SortOrder: 30. Active: true.

Fields:

| key | T | labelEn / labelAr | placeholder | req | default |
|---|---|---|---|---|---|
| celebrantName | txt | Celebrant / `صاحب المناسبة` | — | Y | — |
| age | num | Age / `العمر` | min=1 max=120 | N | — |
| partyDate | dat | Party Date / `تاريخ الحفلة` | — | Y | — |
| partyTime | tim | Time / `الوقت` | — | Y | 17:00 |
| venue | txt | Venue / `المكان` | Home / Hall | Y | — |
| theme | txt | Theme / `الثيم` | e.g. Unicorn | N | — |
| guestMessage | tex | Message / `رسالة` | rows=2 | N | "يسعدنا حضوركم لمشاركتنا الفرح" |
| primaryColor | col | Primary Colour / `اللون` | — | N | `#e91e63` |
| fontFamily | fnt | Font / `الخط` | — | N | `'Cairo', sans-serif` |

Overlays (`colorBinding: primary`):

| fieldKey | top% | left% | width% | fontVh | weight |
|---|---|---|---|---|---|
| guestMessage | 27 | 50 | 70 | 2.6 | 400 |
| celebrantName | 36 | 50 | 70 | 5.5 | 700 |
| age | 47 | 50 | 30 | 7.0 | 800 |
| partyDate | 55 | 50 | 60 | 3.0 | 500 |
| partyTime | 60 | 50 | 60 | 2.8 | 400 |
| venue | 65 | 50 | 75 | 2.8 | 500 |
| theme | 70 | 50 | 60 | 2.4 | 600 |

Decorations:

| type | source | colour | top% | left% | width% | iconVh | z |
|---|---|---|---|---|---|---|---|
| icon | PartyPopper | #e91e63 | 22 | 25 | 6 | 3.5 | 1 |
| icon | Cake | #e91e63 | 22 | 75 | 6 | 3.5 | 1 |
| icon | Gift | #b56576 | 32 | 50 | 5 | 3.0 | 1 |

### 6.5 blessed_births.jpg → "Blessed Newborn" / "مولود مبارك"

Tone: soft, joyful, baby-girl-leaning (the artwork is pink-floral).

Names: `nameEn = "Blessed Newborn"`, `nameAr = "مولود مبارك"`. Categories: `[baby_shower]`. SortOrder: 40. Active: true.

Fields:

| key | T | labelEn / labelAr | placeholder | req | default |
|---|---|---|---|---|---|
| babyName | txt | Baby Name / `اسم المولود` | — | N | — |
| parents | txt | Parents / `الوالدان` | e.g. Ahmad & Reem | Y | — |
| birthDate | dat | Birth Date / `تاريخ الولادة` | — | N | — |
| eventDate | dat | Celebration Date / `تاريخ الاستقبال` | — | Y | — |
| eventTime | tim | Time / `الوقت` | — | Y | 18:00 |
| venue | txt | Venue / `المكان` | — | Y | — |
| weight | num | Weight (kg) / `الوزن (كجم)` | step=0.01 min=0.5 max=10 | N | — |
| guestMessage | tex | Message / `رسالة` | rows=2 | N | "أهلاً وسهلاً بضيف الحياة الجديد" |
| primaryColor | col | Primary Colour / `اللون` | — | N | `#e0aaae` |
| fontFamily | fnt | Font / `الخط` | — | N | `'Cairo', sans-serif` |

Overlays (`colorBinding: primary`):

| fieldKey | top% | left% | width% | fontVh | weight |
|---|---|---|---|---|---|
| guestMessage | 30 | 50 | 70 | 2.4 | 400 |
| babyName | 38 | 50 | 70 | 6.5 | 700 |
| parents | 50 | 50 | 70 | 3.0 | 500 |
| birthDate | 56 | 50 | 60 | 2.6 | 400 |
| weight | 60 | 50 | 60 | 2.4 | 400 |
| eventDate | 65 | 50 | 60 | 3.0 | 500 |
| eventTime | 70 | 50 | 60 | 2.6 | 400 |
| venue | 75 | 50 | 75 | 2.6 | 500 |

Decorations:

| type | source | colour | top% | left% | width% | iconVh | z |
|---|---|---|---|---|---|---|---|
| icon | HeartPulse | #e0aaae | 33 | 50 | 5 | 3.2 | 1 |
| icon | Sparkles | #e0aaae | 46 | 25 | 4 | 2.4 | 1 |
| icon | Sparkles | #e0aaae | 46 | 75 | 4 | 2.4 | 1 |

### 6.6 woman_invitation.jpg → "Ladies' Gathering" / "ملتقى السيدات"

Tone: refined, modern, hostess-led. Big empty top, burgundy peonies bottom.

Names: `nameEn = "Ladies' Gathering"`, `nameAr = "ملتقى السيدات"`. Categories: `[ladies_event]` *(new)*. SortOrder: 50. Active: true.

Fields:

| key | T | labelEn / labelAr | placeholder | req | default |
|---|---|---|---|---|---|
| hostessName | txt | Hostess / `المضيفة` | e.g. أم سارة | Y | — |
| eventTitle | txt | Event Title / `عنوان المناسبة` | e.g. صباحية قهوة | Y | — |
| eventDate | dat | Date / `التاريخ` | — | Y | — |
| eventTime | tim | Time / `الوقت` | — | Y | 10:00 |
| venue | txt | Venue / `المكان` | Home / Café | Y | — |
| address | txt | Address / `العنوان` | — | N | — |
| dressCode | txt | Dress Code / `قواعد اللباس` | optional | N | — |
| guestMessage | tex | Message / `رسالة للضيوف` | rows=3 | N | "يسرّني أن تكنّ بصحبتي" |
| primaryColor | col | Primary Colour / `اللون` | — | N | `#8b2243` |
| fontFamily | fnt | Font / `الخط` | — | N | `'Cairo', sans-serif` |

Overlays (`colorBinding: primary`):

| fieldKey | top% | left% | width% | fontVh | weight |
|---|---|---|---|---|---|
| guestMessage | 12 | 50 | 70 | 2.4 | 400 |
| eventTitle | 22 | 50 | 70 | 5.0 | 700 |
| hostessName | 33 | 50 | 70 | 3.4 | 500 |
| eventDate | 43 | 50 | 60 | 3.0 | 500 |
| eventTime | 48 | 50 | 60 | 2.8 | 400 |
| venue | 54 | 50 | 75 | 2.6 | 500 |
| address | 59 | 50 | 75 | 2.2 | 400 |
| dressCode | 64 | 50 | 60 | 2.2 | 600 |

Decorations:

| type | source | colour | top% | left% | width% | iconVh | z |
|---|---|---|---|---|---|---|---|
| icon | Flower2 | #8b2243 | 18 | 18 | 5 | 3.0 | 1 |
| icon | Flower2 | #8b2243 | 18 | 82 | 5 | 3.0 | 1 |
| icon | Sparkle | #8b2243 | 28 | 50 | 4 | 2.0 | 1 |

## 7. Execution sequence (for the next session)

The next session can do this UI-driven via Playwright MCP **or** via direct API calls — both paths are viable; UI-driven is recommended because it exercises the same code path users hit, but API is faster for the bulk save.

**Pre-load these tools** in the next session's tool budget:
- `mcp__plugin_playwright_playwright__browser_navigate`
- `mcp__plugin_playwright_playwright__browser_snapshot`
- `mcp__plugin_playwright_playwright__browser_click`
- `mcp__plugin_playwright_playwright__browser_type`
- `mcp__plugin_playwright_playwright__browser_fill_form`
- `mcp__plugin_playwright_playwright__browser_file_upload` *(separate from `fill_form` — required for the image input)*
- `mcp__plugin_playwright_playwright__browser_evaluate` *(handy fallback for direct fetch calls when UI is slow)*

**Sequence:**

1. **Login** — `http://localhost:3000/ar/login` → email `test.superadmin@labbe.sa`, password `password123`. Use the email-login button (`تسجيل الدخول بالبريد الإلكترونى`), not the phone form.
2. **(Optional cleanup, if user approves §4.1)** —
   - `DELETE /api/v2/admin/template-categories/69f8aa23d617b18cf0bc8172` (the `hhhh` row)
   - `DELETE /api/v2/admin/templates/{id}` for each of the 3 junk templates (`hi`, `testing categories`, `Playwright Test Template`)
3. **Categories** — POST to `/api/v2/admin/template-categories` once per row:
   ```
   { code: "wedding",      nameEn: "Wedding",       nameAr: "زفاف",          sortOrder: 10 }
   { code: "engagement",   nameEn: "Engagement",    nameAr: "خطوبة",         sortOrder: 20 }
   { code: "birthday",     nameEn: "Birthday",      nameAr: "عيد ميلاد",     sortOrder: 30 }
   { code: "baby_shower",  nameEn: "Baby Shower",   nameAr: "استقبال مولود", sortOrder: 40 }
   { code: "ladies_event", nameEn: "Ladies' Event", nameAr: "مناسبة نسائية", sortOrder: 50 }
   ```
4. **Templates** — for each of the 6 specs in §6:
   1. Navigate to `/ar/admin-dash/templates/new`.
   2. Upload the image via the hidden `<input type="file">` inside `ImageUploadPane` (use `browser_file_upload`, target the `<input accept="image/jpeg,image/png,image/webp">`).
   3. Wait for the preview canvas to render (signals dimensions are read).
   4. Fill `nameEn`, `nameAr`. Tick the right category checkbox (`CheckBoxItems`, `name="categories"`). Set `sortOrder`. Leave `active` toggled on.
   5. Add fields one at a time via the `+ Add Field` button, expand each card, fill in the columns from §6's table.
   6. Add overlays via `+ Add Overlay`, bind each to its field by key, then position with the percent inputs.
   7. Add decorations via `+ Add Decoration`. For icon decorations, click the icon-picker button and search by name (Crown, Heart, etc.).
   8. Click `حفظ` (Save). Editor uploads the image to S3 then POSTs the JSON. On success it redirects to `/ar/admin-dash/templates/{newId}`.
   9. Snapshot the post-save page and screenshot the canvas to verify nothing collides with decorations.
5. **Verification** —
   - `GET /api/v2/admin/templates` → confirm 6 active templates with correct `categories[]`.
   - Open `/ar/host/create-event` Step Three (will need a host login or the editor's "Preview as Host" route if it exists) and confirm thumbnails show, category filter works, and clicking each opens a `DynamicTemplateForm` whose canvas matches the editor preview.
   - For `marriage.jpg`, sanity-check that text remains legible regardless of the host's `primaryColor` choice (because overlays are `colorBinding: custom`).

## 8. Acceptance criteria

- 6 templates exist, each `active: true`, each with non-empty `imageUrl` + `imageS3Key`.
- Each template's `categories[]` contains the code listed in §2.
- Each template renders in `TemplatePreviewCanvas` with **no overlay or decoration touching the image's decorative zone** as defined in §5.
- For every required overlay, the bound field is present in `fields[]` (no orphan overlays).
- All field labels and placeholders are populated in both `labelEn`/`labelAr` and `placeholderEn`/`placeholderAr` where applicable (so the host form is bilingual).
- Step Three of `create-event` shows all 6 thumbnails when no category filter is applied; filtering by `wedding` shows 2, by `engagement`/`birthday`/`baby_shower`/`ladies_event` shows 1 each.

## 9. Risks & open questions

- **S3 upload may fail in dev.** If `templatesService.adminUploadImage` errors out (e.g. AWS creds missing), the editor surfaces a toast. Fallback: ask the user for an alternate static asset host or pause for a `MINIO_*` config check.
- **`ladies_event` is a new code.** If any backend list later filters categories by an allow-list, this could need a constants update. Spot-check `INITIAL_TEMPLATE_NAMES` and any RBAC/category gating before assuming it surfaces to hosts.
- **Decoration rendering of icons** depends on lucide-react names matching `IconPicker.jsx` ICON_MAP keys exactly (case-sensitive). Use the picker, don't hand-type, to avoid silent fallbacks.
- **Field-form length** on mobile — Garden Wedding has 11 fields; check that the host-side form scrolls cleanly. If it feels heavy, split the lower-priority fields (rsvpDate, hashtag) into a "Optional" expansion later.

## 10. Out of scope (for this plan)

- Adding new icons to `IconPicker.jsx`.
- Replacing the placeholder S3 paths in `seedInitialTemplates.js` (those templates aren't in the DB anyway).
- Adding a `women_event` enum anywhere outside `TemplateCategory` rows.
- Translations for any new admin-side strings (no new strings introduced; only data).
- Mobile (`halla-mobile/`) parity — the same `Template` rows feed both surfaces, so this should "just work", but it's not verified here.
