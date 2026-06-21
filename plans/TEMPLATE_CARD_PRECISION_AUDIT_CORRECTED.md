# Template-card precision audit — corrected implementation specification

> Status: code and visual-proof preparation complete; database and S3 apply mode have **not** been run.

## Locked standards

- Every card has `eventDate`, `eventTime`, and `venue` in one horizontal RTL row: Date on the visual right, Time in the centre, Venue on the visual left.
- Every metadata column has its icon above its value: `CalendarDays`, `Clock`, `MapPin`.
- Bride and groom are side by side whenever both fields exist.
- `invitationMessage` is a three-row textarea. Per-card maximum lengths are lowered where the measured band is smaller.
- Shared concepts use one canonical key. No editable content field has a default value.
- `primaryColor` and `fontFamily` are style-only and have no overlay.
- No forbidden surname appears in the canonical vocabulary or precision specs.
- Overlay coordinates are centres because the renderer uses `translate(-50%, -50%)`.

## Canonical vocabulary

| key | type | label EN | label AR | placeholder EN | placeholder AR | rows | max length |
|---|---|---|---|---|---|---:|---:|
| `invitationTitle` | text | Invitation Title | عنوان الدعوة | e.g. "Invitation" | مثل: "دعوة" | — | 30 |
| `invitationMessage` | textarea | Invitation Message | رسالة الدعوة | e.g. We are honoured to invite you… | مثل: يتشرف بدعوتكم لحضور… | 3 | 180 |
| `eventNote` | text | Event Note | عبارة المناسبة | e.g. We would be delighted by your presence | مثل: يسعدنا ويشرفنا حضوركم | — | 90 |
| `mealNote` | text | Meal Note | عبارة الضيافة | e.g. Dinner will be served | مثل: يتبع الحفل تناول طعام العشاء | — | 80 |
| `attendanceNote` | text | Attendance Note | ملاحظة الحضور | e.g. This invitation is personal | مثل: الدعوة شخصية | — | 60 |
| `closingMessage` | text | Closing Message | العبارة الختامية | e.g. Your presence completes our joy | مثل: بحضوركم تكتمل فرحتنا | — | 100 |
| `openingVerse` | text | Opening Verse | الآية | e.g. Quranic verse or short blessing | مثل: آية قرآنية أو دعاء قصير | — | 160 |
| `groomName` | text | Groom | العريس | e.g. Khalid | مثل: خالد | — | 40 |
| `brideName` | text | Bride | العروس | e.g. Sara Al-Qahtani | مثل سارة القحطاني | — | 60 |
| `groomNameLatin` | text | Groom Name (Latin) | اسم العريس بالإنجليزية | e.g. Khalid | مثال: Khalid | — | 40 |
| `brideNameLatin` | text | Bride Name (Latin) | اسم العروس بالإنجليزية | e.g. Sara | مثال: Sara | — | 40 |
| `hostName` | text | Host | المضيف | e.g. Abu Mohammad | مثل أبو محمد | — | 60 |
| `celebrantName` | text | Celebrant | صاحب المناسبة | e.g. Layan | مثل ليان | — | 60 |
| `babyName` | text | Baby Name | اسم المولود | e.g. Hossam | مثل حسام | — | 40 |
| `babyInitial` | text | Baby Initial | الحرف الأول من اسم المولود | e.g. H | مثال: H | — | 1 |
| `babyNameLatin` | text | Baby Name (Latin) | اسم المولود بالإنجليزية | e.g. Yara | مثال: Yara | — | 40 |
| `parentsNames` | text | Parents | اسما الوالدين | e.g. Ahmad & Reem | مثل: أحمد وريم | — | 60 |
| `eventTitle` | text | Event Title | عنوان المناسبة | e.g. Eid Gathering | مثل تجمع العيد | — | 80 |
| `eventDate` | date | Date | التاريخ |  |  | — | — |
| `eventTime` | time | Time | الوقت |  |  | — | — |
| `venue` | text | Venue | المكان | e.g. Riyadh, Hilton Hall | مثل الرياض، قاعة هيلتون | — | 80 |
| `primaryColor` | color | Primary Colour | اللون الأساسي |  |  | — | — |
| `fontFamily` | font | Font | الخط |  |  | — | — |

## Per-template specifications

The proof comparison for referenced cards is ordered **source | proposed render | completed reference**. Unreferenced cards contain source | proposed render.

### 1. Royal Groom / دعوة زفاف ملكية

- Source: `marriage.jpg` (4500×8000)
- Reference: `1.png` (4500×8000; ratio difference 0.000%)
- Categories: `wedding`
- Assessment: Measured from numbered reference and tuned in the first proof pass.
- Proof: [compare-01-marriage.png](template-audit-corrected/proofs/compare-01-marriage.png)

#### Fields

| key | type | label EN | label AR | placeholder EN | placeholder AR | required | rows | max length |
|---|---|---|---|---|---|---|---:|---:|
| `invitationTitle` | text | Invitation Title | عنوان الدعوة | e.g. "Invitation" | مثل: "دعوة" | no | — | 30 |
| `invitationMessage` | textarea | Invitation Message | رسالة الدعوة | e.g. We are honoured to invite you… | مثل: يتشرف بدعوتكم لحضور… | no | 3 | 150 |
| `eventNote` | text | Event Note | عبارة المناسبة | e.g. We would be delighted by your presence | مثل: يسعدنا ويشرفنا حضوركم | no | — | 90 |
| `mealNote` | text | Meal Note | عبارة الضيافة | e.g. Dinner will be served | مثل: يتبع الحفل تناول طعام العشاء | no | — | 80 |
| `closingMessage` | text | Closing Message | العبارة الختامية | e.g. Your presence completes our joy | مثل: بحضوركم تكتمل فرحتنا | no | — | 100 |
| `eventDate` | date | Date | التاريخ |  |  | yes | — | — |
| `eventTime` | time | Time | الوقت |  |  | yes | — | — |
| `venue` | text | Venue | المكان | e.g. Riyadh, Hilton Hall | مثل الرياض، قاعة هيلتون | yes | — | 80 |
| `primaryColor` | color | Primary Colour | اللون الأساسي |  |  | no | — | — |
| `fontFamily` | font | Font | الخط |  |  | no | — | — |

#### Overlays

| field | top % | left % | width % | font vh | line height | max lines | weight | align | colour binding | colour | font | z |
|---|---:|---:|---:|---:|---:|---:|---|---|---|---|---|---:|
| `invitationTitle` | 34 | 50 | 42 | 6.2 | 1.35 | 1 | 700 | center | custom | #e8c04f | var(--font-amiri), 'Amiri', serif | 2 |
| `invitationMessage` | 46 | 50 | 66 | 2.2 | 1.45 | 3 | 400 | center | custom | #f3e7df | var(--font-amiri), 'Amiri', serif | 2 |
| `eventNote` | 55 | 50 | 74 | 2.5 | 1.35 | 1 | 600 | center | custom | #e8c04f | var(--font-amiri), 'Amiri', serif | 2 |
| `mealNote` | 61 | 50 | 65 | 2 | 1.35 | 1 | 400 | center | custom | #f3e7df | var(--font-amiri), 'Amiri', serif | 2 |
| `closingMessage` | 79 | 50 | 72 | 4.2 | 1.15 | 2 | 700 | center | custom | #e8c04f | var(--font-amiri), 'Amiri', serif | 2 |
| `eventDate` | 70.5 | 72 | 23 | 1.8 | 1.2 | 2 | 500 | center | custom | #e8c04f | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventTime` | 70.5 | 50 | 18 | 1.8 | 1.2 | 2 | 500 | center | custom | #e8c04f | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `venue` | 70.5 | 28 | 24 | 1.8 | 1.2 | 2 | 500 | center | custom | #e8c04f | var(--font-cairo), 'Cairo', sans-serif | 2 |

#### Decorations

| icon/type | top % | left % | width % | size vh | colour | z |
|---|---:|---:|---:|---:|---|---:|
| CalendarDays | 66 | 72 | 4 | 2.6 | #e8c04f | 1 |
| Clock | 66 | 50 | 4 | 2.6 | #e8c04f | 1 |
| MapPin | 66 | 28 | 4 | 2.6 | #e8c04f | 1 |

### 2. Pearl Da'wah Wedding / دعوة زفاف لؤلؤية

- Source: `wedding_white_dawah.jpg` (4500×8000)
- Reference: `2.png` (4500×8000; ratio difference 0.000%)
- Categories: `wedding`
- Assessment: Measured from numbered reference and tuned in the first proof pass.
- Proof: [compare-02-wedding_white_dawah.png](template-audit-corrected/proofs/compare-02-wedding_white_dawah.png)

#### Fields

| key | type | label EN | label AR | placeholder EN | placeholder AR | required | rows | max length |
|---|---|---|---|---|---|---|---:|---:|
| `openingVerse` | text | Opening Verse | الآية | e.g. Quranic verse or short blessing | مثل: آية قرآنية أو دعاء قصير | no | — | 160 |
| `invitationMessage` | textarea | Invitation Message | رسالة الدعوة | e.g. We are honoured to invite you… | مثل: يتشرف بدعوتكم لحضور… | no | 3 | 150 |
| `hostName` | text | Host | المضيف | e.g. Abu Mohammad | مثل أبو محمد | no | — | 60 |
| `eventNote` | text | Event Note | عبارة المناسبة | e.g. We would be delighted by your presence | مثل: يسعدنا ويشرفنا حضوركم | no | — | 90 |
| `groomName` | text | Groom | العريس | e.g. Khalid | مثل: خالد | yes | — | 40 |
| `closingMessage` | text | Closing Message | العبارة الختامية | e.g. Your presence completes our joy | مثل: بحضوركم تكتمل فرحتنا | no | — | 100 |
| `eventDate` | date | Date | التاريخ |  |  | yes | — | — |
| `eventTime` | time | Time | الوقت |  |  | yes | — | — |
| `venue` | text | Venue | المكان | e.g. Riyadh, Hilton Hall | مثل الرياض، قاعة هيلتون | yes | — | 80 |
| `primaryColor` | color | Primary Colour | اللون الأساسي |  |  | no | — | — |
| `fontFamily` | font | Font | الخط |  |  | no | — | — |

#### Overlays

| field | top % | left % | width % | font vh | line height | max lines | weight | align | colour binding | colour | font | z |
|---|---:|---:|---:|---:|---:|---:|---|---|---|---|---|---:|
| `openingVerse` | 27 | 50 | 68 | 3 | 1.35 | 1 | 700 | center | primary | — | var(--font-amiri), 'Amiri', serif | 2 |
| `invitationMessage` | 38 | 50 | 76 | 2.1 | 1.45 | 3 | 400 | center | primary | — | var(--font-amiri), 'Amiri', serif | 2 |
| `hostName` | 49 | 50 | 66 | 2.8 | 1.35 | 1 | 600 | center | primary | — | var(--font-amiri), 'Amiri', serif | 2 |
| `eventNote` | 54 | 50 | 66 | 2 | 1.35 | 1 | 400 | center | primary | — | var(--font-amiri), 'Amiri', serif | 2 |
| `groomName` | 64 | 50 | 62 | 5.6 | 1.35 | 1 | 700 | center | primary | — | var(--font-amiri), 'Amiri', serif | 2 |
| `closingMessage` | 72 | 50 | 62 | 2 | 1.35 | 1 | 400 | center | primary | — | var(--font-amiri), 'Amiri', serif | 2 |
| `eventDate` | 84.5 | 72 | 23 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventTime` | 84.5 | 50 | 18 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `venue` | 84.5 | 28 | 24 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |

#### Decorations

| icon/type | top % | left % | width % | size vh | colour | z |
|---|---:|---:|---:|---:|---|---:|
| CalendarDays | 80 | 72 | 4 | 2.6 | #274866 | 1 |
| Clock | 80 | 50 | 4 | 2.6 | #274866 | 1 |
| MapPin | 80 | 28 | 4 | 2.6 | #274866 | 1 |

### 3. Royal Da'wah Wedding / دعوة الفرح الملكي

- Source: `wedding_navy_dawah.jpg` (4500×8000)
- Reference: `3.png` (4500×8000; ratio difference 0.000%)
- Categories: `wedding`
- Assessment: Measured from numbered reference and tuned in the first proof pass.
- Proof: [compare-03-wedding_navy_dawah.png](template-audit-corrected/proofs/compare-03-wedding_navy_dawah.png)

#### Fields

| key | type | label EN | label AR | placeholder EN | placeholder AR | required | rows | max length |
|---|---|---|---|---|---|---|---:|---:|
| `openingVerse` | text | Opening Verse | الآية | e.g. Quranic verse or short blessing | مثل: آية قرآنية أو دعاء قصير | no | — | 160 |
| `invitationMessage` | textarea | Invitation Message | رسالة الدعوة | e.g. We are honoured to invite you… | مثل: يتشرف بدعوتكم لحضور… | no | 3 | 150 |
| `hostName` | text | Host | المضيف | e.g. Abu Mohammad | مثل أبو محمد | no | — | 60 |
| `eventNote` | text | Event Note | عبارة المناسبة | e.g. We would be delighted by your presence | مثل: يسعدنا ويشرفنا حضوركم | no | — | 90 |
| `groomName` | text | Groom | العريس | e.g. Khalid | مثل: خالد | yes | — | 40 |
| `closingMessage` | text | Closing Message | العبارة الختامية | e.g. Your presence completes our joy | مثل: بحضوركم تكتمل فرحتنا | no | — | 100 |
| `eventDate` | date | Date | التاريخ |  |  | yes | — | — |
| `eventTime` | time | Time | الوقت |  |  | yes | — | — |
| `venue` | text | Venue | المكان | e.g. Riyadh, Hilton Hall | مثل الرياض، قاعة هيلتون | yes | — | 80 |
| `primaryColor` | color | Primary Colour | اللون الأساسي |  |  | no | — | — |
| `fontFamily` | font | Font | الخط |  |  | no | — | — |

#### Overlays

| field | top % | left % | width % | font vh | line height | max lines | weight | align | colour binding | colour | font | z |
|---|---:|---:|---:|---:|---:|---:|---|---|---|---|---|---:|
| `openingVerse` | 27 | 50 | 68 | 3 | 1.35 | 1 | 700 | center | custom | #ead9ab | var(--font-amiri), 'Amiri', serif | 2 |
| `invitationMessage` | 38 | 50 | 76 | 2.1 | 1.45 | 3 | 400 | center | custom | #ead9ab | var(--font-amiri), 'Amiri', serif | 2 |
| `hostName` | 49 | 50 | 66 | 2.8 | 1.35 | 1 | 600 | center | custom | #ead9ab | var(--font-amiri), 'Amiri', serif | 2 |
| `eventNote` | 54 | 50 | 66 | 2 | 1.35 | 1 | 400 | center | custom | #ead9ab | var(--font-amiri), 'Amiri', serif | 2 |
| `groomName` | 64 | 50 | 62 | 5.6 | 1.35 | 1 | 700 | center | custom | #ead9ab | var(--font-amiri), 'Amiri', serif | 2 |
| `closingMessage` | 72 | 50 | 62 | 2 | 1.35 | 1 | 400 | center | custom | #ead9ab | var(--font-amiri), 'Amiri', serif | 2 |
| `eventDate` | 84.5 | 72 | 23 | 1.8 | 1.2 | 2 | 500 | center | custom | #ead9ab | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventTime` | 84.5 | 50 | 18 | 1.8 | 1.2 | 2 | 500 | center | custom | #ead9ab | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `venue` | 84.5 | 28 | 24 | 1.8 | 1.2 | 2 | 500 | center | custom | #ead9ab | var(--font-cairo), 'Cairo', sans-serif | 2 |

#### Decorations

| icon/type | top % | left % | width % | size vh | colour | z |
|---|---:|---:|---:|---:|---|---:|
| CalendarDays | 80 | 72 | 4 | 2.6 | #ead9ab | 1 |
| Clock | 80 | 50 | 4 | 2.6 | #ead9ab | 1 |
| MapPin | 80 | 28 | 4 | 2.6 | #ead9ab | 1 |

### 4. Gulf Groom / زفاف الخليج

- Source: `wedding_gulf_groom.jpg` (4500×8000)
- Reference: `4.png` (4500×8000; ratio difference 0.000%)
- Categories: `wedding`
- Assessment: Measured from numbered reference and tuned in the first proof pass.
- Proof: [compare-04-wedding_gulf_groom.png](template-audit-corrected/proofs/compare-04-wedding_gulf_groom.png)

#### Fields

| key | type | label EN | label AR | placeholder EN | placeholder AR | required | rows | max length |
|---|---|---|---|---|---|---|---:|---:|
| `invitationTitle` | text | Invitation Title | عنوان الدعوة | e.g. "Invitation" | مثل: "دعوة" | no | — | 30 |
| `invitationMessage` | textarea | Invitation Message | رسالة الدعوة | e.g. We are honoured to invite you… | مثل: يتشرف بدعوتكم لحضور… | no | 3 | 120 |
| `eventNote` | text | Event Note | عبارة المناسبة | e.g. We would be delighted by your presence | مثل: يسعدنا ويشرفنا حضوركم | no | — | 90 |
| `hostName` | text | Host | المضيف | e.g. Abu Mohammad | مثل أبو محمد | no | — | 60 |
| `closingMessage` | text | Closing Message | العبارة الختامية | e.g. Your presence completes our joy | مثل: بحضوركم تكتمل فرحتنا | no | — | 100 |
| `eventDate` | date | Date | التاريخ |  |  | yes | — | — |
| `eventTime` | time | Time | الوقت |  |  | yes | — | — |
| `venue` | text | Venue | المكان | e.g. Riyadh, Hilton Hall | مثل الرياض، قاعة هيلتون | yes | — | 80 |
| `primaryColor` | color | Primary Colour | اللون الأساسي |  |  | no | — | — |
| `fontFamily` | font | Font | الخط |  |  | no | — | — |

#### Overlays

| field | top % | left % | width % | font vh | line height | max lines | weight | align | colour binding | colour | font | z |
|---|---:|---:|---:|---:|---:|---:|---|---|---|---|---|---:|
| `invitationTitle` | 38 | 50 | 46 | 5.8 | 1.35 | 1 | 700 | center | custom | #c79a2b | var(--font-amiri), 'Amiri', serif | 2 |
| `invitationMessage` | 52 | 50 | 74 | 2.2 | 1.35 | 2 | 400 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventNote` | 69 | 50 | 70 | 2 | 1.35 | 1 | 400 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `hostName` | 74 | 50 | 68 | 2.2 | 1.35 | 1 | 700 | center | custom | #17120e | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `closingMessage` | 82 | 50 | 74 | 3.4 | 1.35 | 1 | 700 | center | primary | — | var(--font-amiri), 'Amiri', serif | 2 |
| `eventDate` | 63.5 | 72 | 23 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventTime` | 63.5 | 50 | 18 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `venue` | 63.5 | 28 | 24 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |

#### Decorations

| icon/type | top % | left % | width % | size vh | colour | z |
|---|---:|---:|---:|---:|---|---:|
| CalendarDays | 59 | 72 | 4 | 2.6 | #9a7627 | 1 |
| Clock | 59 | 50 | 4 | 2.6 | #9a7627 | 1 |
| MapPin | 59 | 28 | 4 | 2.6 | #9a7627 | 1 |

### 5. Rose Garden Wedding / زفاف الحديقة الوردية

- Source: `blessed_births.jpg` (4500×8000)
- Reference: `5.png` (4500×8000; ratio difference 0.000%)
- Categories: `wedding`
- Assessment: Measured from numbered reference and tuned in the first proof pass.
- Proof: [compare-05-blessed_births.png](template-audit-corrected/proofs/compare-05-blessed_births.png)

#### Fields

| key | type | label EN | label AR | placeholder EN | placeholder AR | required | rows | max length |
|---|---|---|---|---|---|---|---:|---:|
| `invitationTitle` | text | Invitation Title | عنوان الدعوة | e.g. "Invitation" | مثل: "دعوة" | no | — | 30 |
| `invitationMessage` | textarea | Invitation Message | رسالة الدعوة | e.g. We are honoured to invite you… | مثل: يتشرف بدعوتكم لحضور… | no | 3 | 110 |
| `eventNote` | text | Event Note | عبارة المناسبة | e.g. We would be delighted by your presence | مثل: يسعدنا ويشرفنا حضوركم | no | — | 90 |
| `groomName` | text | Groom | العريس | e.g. Khalid | مثل: خالد | yes | — | 40 |
| `closingMessage` | text | Closing Message | العبارة الختامية | e.g. Your presence completes our joy | مثل: بحضوركم تكتمل فرحتنا | no | — | 100 |
| `attendanceNote` | text | Attendance Note | ملاحظة الحضور | e.g. This invitation is personal | مثل: الدعوة شخصية | no | — | 60 |
| `eventDate` | date | Date | التاريخ |  |  | yes | — | — |
| `eventTime` | time | Time | الوقت |  |  | yes | — | — |
| `venue` | text | Venue | المكان | e.g. Riyadh, Hilton Hall | مثل الرياض، قاعة هيلتون | yes | — | 80 |
| `primaryColor` | color | Primary Colour | اللون الأساسي |  |  | no | — | — |
| `fontFamily` | font | Font | الخط |  |  | no | — | — |

#### Overlays

| field | top % | left % | width % | font vh | line height | max lines | weight | align | colour binding | colour | font | z |
|---|---:|---:|---:|---:|---:|---:|---|---|---|---|---|---:|
| `invitationTitle` | 13 | 50 | 28 | 5 | 1.35 | 1 | 700 | center | custom | #df8f9c | var(--font-amiri), 'Amiri', serif | 2 |
| `invitationMessage` | 26 | 50 | 70 | 2.1 | 1.35 | 2 | 400 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventNote` | 36 | 50 | 70 | 2.1 | 1.35 | 2 | 400 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `groomName` | 48 | 50 | 56 | 5.8 | 1.35 | 1 | 700 | center | custom | #df8f9c | var(--font-amiri), 'Amiri', serif | 2 |
| `closingMessage` | 57 | 50 | 66 | 2 | 1.35 | 1 | 400 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `attendanceNote` | 87 | 50 | 55 | 2 | 1.35 | 1 | 400 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventDate` | 69.5 | 72 | 23 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventTime` | 69.5 | 50 | 18 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `venue` | 69.5 | 28 | 24 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |

#### Decorations

| icon/type | top % | left % | width % | size vh | colour | z |
|---|---:|---:|---:|---:|---|---:|
| CalendarDays | 65 | 72 | 4 | 2.6 | #df8f9c | 1 |
| Clock | 65 | 50 | 4 | 2.6 | #df8f9c | 1 |
| MapPin | 65 | 28 | 4 | 2.6 | #df8f9c | 1 |

### 6. Burgundy Bloom Wedding / زفاف الورد الأرجواني

- Source: `woman_invitation.jpg` (4500×8000)
- Reference: `6.png` (4500×8000; ratio difference 0.000%)
- Categories: `wedding`, `ladies_event`
- Assessment: Measured from numbered reference and tuned in the first proof pass.
- Proof: [compare-06-woman_invitation.png](template-audit-corrected/proofs/compare-06-woman_invitation.png)

#### Fields

| key | type | label EN | label AR | placeholder EN | placeholder AR | required | rows | max length |
|---|---|---|---|---|---|---|---:|---:|
| `invitationTitle` | text | Invitation Title | عنوان الدعوة | e.g. "Invitation" | مثل: "دعوة" | no | — | 30 |
| `openingVerse` | text | Opening Verse | الآية | e.g. Quranic verse or short blessing | مثل: آية قرآنية أو دعاء قصير | no | — | 160 |
| `invitationMessage` | textarea | Invitation Message | رسالة الدعوة | e.g. We are honoured to invite you… | مثل: يتشرف بدعوتكم لحضور… | no | 3 | 110 |
| `groomName` | text | Groom | العريس | e.g. Khalid | مثل: خالد | yes | — | 40 |
| `brideName` | text | Bride | العروس | e.g. Sara Al-Qahtani | مثل سارة القحطاني | yes | — | 60 |
| `closingMessage` | text | Closing Message | العبارة الختامية | e.g. Your presence completes our joy | مثل: بحضوركم تكتمل فرحتنا | no | — | 100 |
| `eventDate` | date | Date | التاريخ |  |  | yes | — | — |
| `eventTime` | time | Time | الوقت |  |  | yes | — | — |
| `venue` | text | Venue | المكان | e.g. Riyadh, Hilton Hall | مثل الرياض، قاعة هيلتون | yes | — | 80 |
| `primaryColor` | color | Primary Colour | اللون الأساسي |  |  | no | — | — |
| `fontFamily` | font | Font | الخط |  |  | no | — | — |

#### Overlays

| field | top % | left % | width % | font vh | line height | max lines | weight | align | colour binding | colour | font | z |
|---|---:|---:|---:|---:|---:|---:|---|---|---|---|---|---:|
| `invitationTitle` | 8 | 50 | 42 | 4 | 1.35 | 1 | 700 | center | custom | #75805d | var(--font-amiri), 'Amiri', serif | 2 |
| `openingVerse` | 17 | 50 | 76 | 2.5 | 1.35 | 2 | 600 | center | custom | #8f171d | var(--font-amiri), 'Amiri', serif | 2 |
| `invitationMessage` | 29 | 50 | 70 | 2.1 | 1.35 | 3 | 400 | center | custom | #75805d | var(--font-amiri), 'Amiri', serif | 2 |
| `groomName` | 43 | 68 | 31 | 5 | 1.35 | 1 | 700 | center | custom | #8f171d | var(--font-amiri), 'Amiri', serif | 2 |
| `brideName` | 43 | 32 | 31 | 5 | 1.35 | 1 | 700 | center | custom | #8f171d | var(--font-amiri), 'Amiri', serif | 2 |
| `closingMessage` | 72 | 50 | 70 | 3 | 1.35 | 1 | 700 | center | custom | #8f171d | var(--font-amiri), 'Amiri', serif | 2 |
| `eventDate` | 58.5 | 72 | 23 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventTime` | 58.5 | 50 | 18 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `venue` | 58.5 | 28 | 24 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |

#### Decorations

| icon/type | top % | left % | width % | size vh | colour | z |
|---|---:|---:|---:|---:|---|---:|
| CalendarDays | 54 | 72 | 4 | 2.6 | #75805d | 1 |
| Clock | 54 | 50 | 4 | 2.6 | #75805d | 1 |
| MapPin | 54 | 28 | 4 | 2.6 | #75805d | 1 |

### 7. Floral Arch Wedding / زفاف قوس الزهور

- Source: `marriage2.jpg` (4500×8000)
- Reference: `7.png` (4500×8000; ratio difference 0.000%)
- Categories: `wedding`
- Assessment: Measured from numbered reference and tuned in the first proof pass.
- Proof: [compare-07-marriage2.png](template-audit-corrected/proofs/compare-07-marriage2.png)

#### Fields

| key | type | label EN | label AR | placeholder EN | placeholder AR | required | rows | max length |
|---|---|---|---|---|---|---|---:|---:|
| `invitationTitle` | text | Invitation Title | عنوان الدعوة | e.g. "Invitation" | مثل: "دعوة" | no | — | 30 |
| `invitationMessage` | textarea | Invitation Message | رسالة الدعوة | e.g. We are honoured to invite you… | مثل: يتشرف بدعوتكم لحضور… | no | 3 | 100 |
| `eventNote` | text | Event Note | عبارة المناسبة | e.g. We would be delighted by your presence | مثل: يسعدنا ويشرفنا حضوركم | no | — | 90 |
| `brideName` | text | Bride | العروس | e.g. Sara Al-Qahtani | مثل سارة القحطاني | yes | — | 60 |
| `closingMessage` | text | Closing Message | العبارة الختامية | e.g. Your presence completes our joy | مثل: بحضوركم تكتمل فرحتنا | no | — | 100 |
| `eventDate` | date | Date | التاريخ |  |  | yes | — | — |
| `eventTime` | time | Time | الوقت |  |  | yes | — | — |
| `venue` | text | Venue | المكان | e.g. Riyadh, Hilton Hall | مثل الرياض، قاعة هيلتون | yes | — | 80 |
| `primaryColor` | color | Primary Colour | اللون الأساسي |  |  | no | — | — |
| `fontFamily` | font | Font | الخط |  |  | no | — | — |

#### Overlays

| field | top % | left % | width % | font vh | line height | max lines | weight | align | colour binding | colour | font | z |
|---|---:|---:|---:|---:|---:|---:|---|---|---|---|---|---:|
| `invitationTitle` | 13 | 50 | 28 | 4.2 | 1.35 | 1 | 700 | center | custom | #d995a0 | var(--font-amiri), 'Amiri', serif | 2 |
| `invitationMessage` | 27 | 50 | 68 | 2 | 1.35 | 2 | 400 | center | custom | #718766 | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventNote` | 35 | 50 | 64 | 2 | 1.35 | 1 | 400 | center | custom | #718766 | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `brideName` | 44 | 50 | 56 | 5.4 | 1.35 | 1 | 700 | center | custom | #d995a0 | var(--font-amiri), 'Amiri', serif | 2 |
| `closingMessage` | 55 | 50 | 68 | 2 | 1.35 | 1 | 400 | center | custom | #718766 | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventDate` | 65.5 | 72 | 23 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventTime` | 65.5 | 50 | 18 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `venue` | 65.5 | 28 | 24 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |

#### Decorations

| icon/type | top % | left % | width % | size vh | colour | z |
|---|---:|---:|---:|---:|---|---:|
| CalendarDays | 61 | 72 | 4 | 2.6 | #718766 | 1 |
| Clock | 61 | 50 | 4 | 2.6 | #718766 | 1 |
| MapPin | 61 | 28 | 4 | 2.6 | #718766 | 1 |

### 8. Candle Engagement / خطوبة الشموع

- Source: `engament.jpg` (4500×8000)
- Reference: `8.png` (4500×8000; ratio difference 0.000%)
- Categories: `wedding`, `engagement`
- Assessment: Measured from numbered reference and tuned in the first proof pass.
- Proof: [compare-08-engament.png](template-audit-corrected/proofs/compare-08-engament.png)

#### Fields

| key | type | label EN | label AR | placeholder EN | placeholder AR | required | rows | max length |
|---|---|---|---|---|---|---|---:|---:|
| `invitationTitle` | text | Invitation Title | عنوان الدعوة | e.g. "Invitation" | مثل: "دعوة" | no | — | 30 |
| `openingVerse` | text | Opening Verse | الآية | e.g. Quranic verse or short blessing | مثل: آية قرآنية أو دعاء قصير | no | — | 160 |
| `invitationMessage` | textarea | Invitation Message | رسالة الدعوة | e.g. We are honoured to invite you… | مثل: يتشرف بدعوتكم لحضور… | no | 3 | 100 |
| `groomName` | text | Groom | العريس | e.g. Khalid | مثل: خالد | yes | — | 40 |
| `brideName` | text | Bride | العروس | e.g. Sara Al-Qahtani | مثل سارة القحطاني | yes | — | 60 |
| `closingMessage` | text | Closing Message | العبارة الختامية | e.g. Your presence completes our joy | مثل: بحضوركم تكتمل فرحتنا | no | — | 100 |
| `attendanceNote` | text | Attendance Note | ملاحظة الحضور | e.g. This invitation is personal | مثل: الدعوة شخصية | no | — | 60 |
| `eventDate` | date | Date | التاريخ |  |  | yes | — | — |
| `eventTime` | time | Time | الوقت |  |  | yes | — | — |
| `venue` | text | Venue | المكان | e.g. Riyadh, Hilton Hall | مثل الرياض، قاعة هيلتون | yes | — | 80 |
| `primaryColor` | color | Primary Colour | اللون الأساسي |  |  | no | — | — |
| `fontFamily` | font | Font | الخط |  |  | no | — | — |

#### Overlays

| field | top % | left % | width % | font vh | line height | max lines | weight | align | colour binding | colour | font | z |
|---|---:|---:|---:|---:|---:|---:|---|---|---|---|---|---:|
| `invitationTitle` | 10 | 50 | 24 | 4.6 | 1.35 | 1 | 700 | center | custom | #d98f9b | var(--font-amiri), 'Amiri', serif | 2 |
| `openingVerse` | 20 | 50 | 78 | 2.4 | 1.35 | 2 | 600 | center | custom | #7f805e | var(--font-amiri), 'Amiri', serif | 2 |
| `invitationMessage` | 31 | 50 | 68 | 2.1 | 1.35 | 2 | 400 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `groomName` | 44 | 68 | 30 | 5 | 1.35 | 1 | 700 | center | custom | #d98f9b | var(--font-amiri), 'Amiri', serif | 2 |
| `brideName` | 44 | 32 | 30 | 5 | 1.35 | 1 | 700 | center | custom | #d98f9b | var(--font-amiri), 'Amiri', serif | 2 |
| `closingMessage` | 55 | 50 | 68 | 2 | 1.35 | 1 | 400 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `attendanceNote` | 78 | 50 | 55 | 2 | 1.35 | 1 | 400 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventDate` | 67.5 | 72 | 23 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventTime` | 67.5 | 50 | 18 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `venue` | 67.5 | 28 | 24 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |

#### Decorations

| icon/type | top % | left % | width % | size vh | colour | z |
|---|---:|---:|---:|---:|---|---:|
| CalendarDays | 63 | 72 | 4 | 2.6 | #746d5e | 1 |
| Clock | 63 | 50 | 4 | 2.6 | #746d5e | 1 |
| MapPin | 63 | 28 | 4 | 2.6 | #746d5e | 1 |

### 9. Sacred Vows / عقد قران مبارك

- Source: `marriage_contract_arch.jpg` (4500×8000)
- Reference: `9.png` (4500×8000; ratio difference 0.000%)
- Categories: `wedding`
- Assessment: Measured from numbered reference and tuned in the first proof pass.
- Proof: [compare-09-marriage_contract_arch.png](template-audit-corrected/proofs/compare-09-marriage_contract_arch.png)

#### Fields

| key | type | label EN | label AR | placeholder EN | placeholder AR | required | rows | max length |
|---|---|---|---|---|---|---|---:|---:|
| `invitationTitle` | text | Invitation Title | عنوان الدعوة | e.g. "Invitation" | مثل: "دعوة" | no | — | 30 |
| `invitationMessage` | textarea | Invitation Message | رسالة الدعوة | e.g. We are honoured to invite you… | مثل: يتشرف بدعوتكم لحضور… | no | 3 | 100 |
| `eventTitle` | text | Event Title | عنوان المناسبة | e.g. Eid Gathering | مثل تجمع العيد | no | — | 80 |
| `eventDate` | date | Date | التاريخ |  |  | yes | — | — |
| `eventTime` | time | Time | الوقت |  |  | yes | — | — |
| `venue` | text | Venue | المكان | e.g. Riyadh, Hilton Hall | مثل الرياض، قاعة هيلتون | yes | — | 80 |
| `primaryColor` | color | Primary Colour | اللون الأساسي |  |  | no | — | — |
| `fontFamily` | font | Font | الخط |  |  | no | — | — |

#### Overlays

| field | top % | left % | width % | font vh | line height | max lines | weight | align | colour binding | colour | font | z |
|---|---:|---:|---:|---:|---:|---:|---|---|---|---|---|---:|
| `invitationTitle` | 17 | 50 | 48 | 4.2 | 1.35 | 1 | 700 | center | custom | #5b3826 | var(--font-amiri), 'Amiri', serif | 2 |
| `invitationMessage` | 30 | 50 | 72 | 2.1 | 1.35 | 2 | 400 | center | custom | #5b3826 | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventTitle` | 48 | 50 | 62 | 7 | 1.35 | 1 | 700 | center | custom | #d9a818 | var(--font-amiri), 'Amiri', serif | 2 |
| `eventDate` | 70.5 | 72 | 23 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventTime` | 70.5 | 50 | 18 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `venue` | 70.5 | 28 | 24 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |

#### Decorations

| icon/type | top % | left % | width % | size vh | colour | z |
|---|---:|---:|---:|---:|---|---:|
| CalendarDays | 66 | 72 | 4 | 2.6 | #5b3826 | 1 |
| Clock | 66 | 50 | 4 | 2.6 | #5b3826 | 1 |
| MapPin | 66 | 28 | 4 | 2.6 | #5b3826 | 1 |

### 10. Eid Al-Adha / عيد الأضحى

- Source: `general_spring.jpg` (4500×8000)
- Reference: `10.png` (4500×8000; ratio difference 0.000%)
- Categories: `general_event`
- Assessment: Measured from numbered reference and tuned in the first proof pass.
- Proof: [compare-10-general_spring.png](template-audit-corrected/proofs/compare-10-general_spring.png)

#### Fields

| key | type | label EN | label AR | placeholder EN | placeholder AR | required | rows | max length |
|---|---|---|---|---|---|---|---:|---:|
| `invitationMessage` | textarea | Invitation Message | رسالة الدعوة | e.g. We are honoured to invite you… | مثل: يتشرف بدعوتكم لحضور… | no | 3 | 100 |
| `eventNote` | text | Event Note | عبارة المناسبة | e.g. We would be delighted by your presence | مثل: يسعدنا ويشرفنا حضوركم | no | — | 90 |
| `eventTitle` | text | Event Title | عنوان المناسبة | e.g. Eid Gathering | مثل تجمع العيد | yes | — | 80 |
| `openingVerse` | text | Opening Verse | الآية | e.g. Quranic verse or short blessing | مثل: آية قرآنية أو دعاء قصير | no | — | 160 |
| `closingMessage` | text | Closing Message | العبارة الختامية | e.g. Your presence completes our joy | مثل: بحضوركم تكتمل فرحتنا | no | — | 100 |
| `eventDate` | date | Date | التاريخ |  |  | yes | — | — |
| `eventTime` | time | Time | الوقت |  |  | yes | — | — |
| `venue` | text | Venue | المكان | e.g. Riyadh, Hilton Hall | مثل الرياض، قاعة هيلتون | yes | — | 80 |
| `primaryColor` | color | Primary Colour | اللون الأساسي |  |  | no | — | — |
| `fontFamily` | font | Font | الخط |  |  | no | — | — |

#### Overlays

| field | top % | left % | width % | font vh | line height | max lines | weight | align | colour binding | colour | font | z |
|---|---:|---:|---:|---:|---:|---:|---|---|---|---|---|---:|
| `invitationMessage` | 15 | 50 | 72 | 2.1 | 1.35 | 2 | 400 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventNote` | 27 | 50 | 72 | 2.1 | 1.35 | 2 | 400 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventTitle` | 38 | 50 | 64 | 5.8 | 1.35 | 1 | 700 | center | custom | #7e8f72 | var(--font-amiri), 'Amiri', serif | 2 |
| `openingVerse` | 48 | 50 | 60 | 1.9 | 1.35 | 1 | 400 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `closingMessage` | 70 | 50 | 66 | 3.6 | 1.35 | 1 | 700 | center | custom | #7e8f72 | var(--font-amiri), 'Amiri', serif | 2 |
| `eventDate` | 59.5 | 72 | 23 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventTime` | 59.5 | 50 | 18 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `venue` | 59.5 | 28 | 24 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |

#### Decorations

| icon/type | top % | left % | width % | size vh | colour | z |
|---|---:|---:|---:|---:|---|---:|
| CalendarDays | 55 | 72 | 4 | 2.6 | #7e8f72 | 1 |
| Clock | 55 | 50 | 4 | 2.6 | #7e8f72 | 1 |
| MapPin | 55 | 28 | 4 | 2.6 | #7e8f72 | 1 |

### 11. Ramadan Iftar / سفرة إفطار رمضان

- Source: `general_lantern.jpg` (4500×8000)
- Reference: `11.png` (4500×8000; ratio difference 0.000%)
- Categories: `general_event`
- Assessment: Measured from numbered reference and tuned in the first proof pass.
- Proof: [compare-11-general_lantern.png](template-audit-corrected/proofs/compare-11-general_lantern.png)

#### Fields

| key | type | label EN | label AR | placeholder EN | placeholder AR | required | rows | max length |
|---|---|---|---|---|---|---|---:|---:|
| `invitationMessage` | textarea | Invitation Message | رسالة الدعوة | e.g. We are honoured to invite you… | مثل: يتشرف بدعوتكم لحضور… | no | 3 | 100 |
| `eventNote` | text | Event Note | عبارة المناسبة | e.g. We would be delighted by your presence | مثل: يسعدنا ويشرفنا حضوركم | no | — | 90 |
| `eventTitle` | text | Event Title | عنوان المناسبة | e.g. Eid Gathering | مثل تجمع العيد | yes | — | 80 |
| `closingMessage` | text | Closing Message | العبارة الختامية | e.g. Your presence completes our joy | مثل: بحضوركم تكتمل فرحتنا | no | — | 100 |
| `eventDate` | date | Date | التاريخ |  |  | yes | — | — |
| `eventTime` | time | Time | الوقت |  |  | yes | — | — |
| `venue` | text | Venue | المكان | e.g. Riyadh, Hilton Hall | مثل الرياض، قاعة هيلتون | yes | — | 80 |
| `primaryColor` | color | Primary Colour | اللون الأساسي |  |  | no | — | — |
| `fontFamily` | font | Font | الخط |  |  | no | — | — |

#### Overlays

| field | top % | left % | width % | font vh | line height | max lines | weight | align | colour binding | colour | font | z |
|---|---:|---:|---:|---:|---:|---:|---|---|---|---|---|---:|
| `invitationMessage` | 37 | 50 | 72 | 2.1 | 1.35 | 2 | 400 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventNote` | 46 | 50 | 72 | 2 | 1.35 | 1 | 400 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventTitle` | 55 | 50 | 68 | 5 | 1.35 | 1 | 700 | center | custom | #742f25 | var(--font-amiri), 'Amiri', serif | 2 |
| `closingMessage` | 80 | 50 | 74 | 3 | 1.35 | 1 | 600 | center | custom | #742f25 | var(--font-amiri), 'Amiri', serif | 2 |
| `eventDate` | 70.5 | 72 | 23 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventTime` | 70.5 | 50 | 18 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `venue` | 70.5 | 28 | 24 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |

#### Decorations

| icon/type | top % | left % | width % | size vh | colour | z |
|---|---:|---:|---:|---:|---|---:|
| CalendarDays | 66 | 72 | 4 | 2.6 | #6e665f | 1 |
| Clock | 66 | 50 | 4 | 2.6 | #6e665f | 1 |
| MapPin | 66 | 28 | 4 | 2.6 | #6e665f | 1 |

### 12. Birthday Party / حفلة عيد ميلاد

- Source: `birthday.jpg` (4500×8000)
- Reference: `12.png` (4500×8000; ratio difference 0.000%)
- Categories: `birthday`
- Assessment: Measured from numbered reference and tuned in the first proof pass.
- Proof: [compare-12-birthday.png](template-audit-corrected/proofs/compare-12-birthday.png)

#### Fields

| key | type | label EN | label AR | placeholder EN | placeholder AR | required | rows | max length |
|---|---|---|---|---|---|---|---:|---:|
| `invitationMessage` | textarea | Invitation Message | رسالة الدعوة | e.g. We are honoured to invite you… | مثل: يتشرف بدعوتكم لحضور… | no | 3 | 120 |
| `celebrantName` | text | Celebrant | صاحب المناسبة | e.g. Layan | مثل ليان | yes | — | 60 |
| `eventNote` | text | Event Note | عبارة المناسبة | e.g. We would be delighted by your presence | مثل: يسعدنا ويشرفنا حضوركم | no | — | 90 |
| `closingMessage` | text | Closing Message | العبارة الختامية | e.g. Your presence completes our joy | مثل: بحضوركم تكتمل فرحتنا | no | — | 100 |
| `eventDate` | date | Date | التاريخ |  |  | yes | — | — |
| `eventTime` | time | Time | الوقت |  |  | yes | — | — |
| `venue` | text | Venue | المكان | e.g. Riyadh, Hilton Hall | مثل الرياض، قاعة هيلتون | yes | — | 80 |
| `primaryColor` | color | Primary Colour | اللون الأساسي |  |  | no | — | — |
| `fontFamily` | font | Font | الخط |  |  | no | — | — |

#### Overlays

| field | top % | left % | width % | font vh | line height | max lines | weight | align | colour binding | colour | font | z |
|---|---:|---:|---:|---:|---:|---:|---|---|---|---|---|---:|
| `invitationMessage` | 23 | 50 | 68 | 2.1 | 1.35 | 3 | 400 | center | custom | #c45c68 | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `celebrantName` | 39 | 50 | 66 | 5.8 | 1.35 | 1 | 700 | center | custom | #c45c68 | var(--font-amiri), 'Amiri', serif | 2 |
| `eventNote` | 50 | 50 | 60 | 2 | 1.35 | 1 | 400 | center | custom | #c45c68 | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `closingMessage` | 78 | 50 | 66 | 2 | 1.35 | 1 | 400 | center | custom | #c45c68 | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventDate` | 64.5 | 72 | 23 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventTime` | 64.5 | 50 | 18 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `venue` | 64.5 | 28 | 24 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |

#### Decorations

| icon/type | top % | left % | width % | size vh | colour | z |
|---|---:|---:|---:|---:|---|---:|
| CalendarDays | 60 | 72 | 4 | 2.6 | #c45c68 | 1 |
| Clock | 60 | 50 | 4 | 2.6 | #c45c68 | 1 |
| MapPin | 60 | 28 | 4 | 2.6 | #c45c68 | 1 |

### 13. Newborn Boy / بشارة المولود

- Source: `newborn_boy.jpg` (4500×8000)
- Reference: `13.png` (4500×8000; ratio difference 0.000%)
- Categories: `baby_shower`
- Assessment: Measured from numbered reference and tuned in the first proof pass.
- Proof: [compare-13-newborn_boy.png](template-audit-corrected/proofs/compare-13-newborn_boy.png)

#### Fields

| key | type | label EN | label AR | placeholder EN | placeholder AR | required | rows | max length |
|---|---|---|---|---|---|---|---:|---:|
| `babyInitial` | text | Baby Initial | الحرف الأول من اسم المولود | e.g. H | مثال: H | no | — | 1 |
| `invitationMessage` | textarea | Invitation Message | رسالة الدعوة | e.g. We are honoured to invite you… | مثل: يتشرف بدعوتكم لحضور… | no | 3 | 100 |
| `eventTitle` | text | Event Title | عنوان المناسبة | e.g. Eid Gathering | مثل تجمع العيد | no | — | 80 |
| `babyName` | text | Baby Name | اسم المولود | e.g. Hossam | مثل حسام | yes | — | 40 |
| `eventNote` | text | Event Note | عبارة المناسبة | e.g. We would be delighted by your presence | مثل: يسعدنا ويشرفنا حضوركم | no | — | 90 |
| `closingMessage` | text | Closing Message | العبارة الختامية | e.g. Your presence completes our joy | مثل: بحضوركم تكتمل فرحتنا | no | — | 100 |
| `eventDate` | date | Date | التاريخ |  |  | yes | — | — |
| `eventTime` | time | Time | الوقت |  |  | yes | — | — |
| `venue` | text | Venue | المكان | e.g. Riyadh, Hilton Hall | مثل الرياض، قاعة هيلتون | yes | — | 80 |
| `primaryColor` | color | Primary Colour | اللون الأساسي |  |  | no | — | — |
| `fontFamily` | font | Font | الخط |  |  | no | — | — |

#### Overlays

| field | top % | left % | width % | font vh | line height | max lines | weight | align | colour binding | colour | font | z |
|---|---:|---:|---:|---:|---:|---:|---|---|---|---|---|---:|
| `babyInitial` | 10 | 50 | 14 | 4 | 1.35 | 1 | 500 | center | custom | #6f91a4 | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `invitationMessage` | 25 | 50 | 72 | 2 | 1.35 | 2 | 500 | center | custom | #547487 | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventTitle` | 33 | 50 | 32 | 3.8 | 1.35 | 1 | 700 | center | custom | #89bdd5 | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `babyName` | 43 | 50 | 60 | 6.2 | 1.35 | 1 | 700 | center | custom | #5d8da7 | var(--font-amiri), 'Amiri', serif | 2 |
| `eventNote` | 51 | 50 | 45 | 3.2 | 1.35 | 1 | 400 | center | custom | #8bbbd0 | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `closingMessage` | 59 | 50 | 72 | 2 | 1.35 | 2 | 500 | center | custom | #547487 | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventDate` | 71.5 | 72 | 23 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventTime` | 71.5 | 50 | 18 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `venue` | 71.5 | 28 | 24 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |

#### Decorations

| icon/type | top % | left % | width % | size vh | colour | z |
|---|---:|---:|---:|---:|---|---:|
| CalendarDays | 67 | 72 | 4 | 2.6 | #6f91a4 | 1 |
| Clock | 67 | 50 | 4 | 2.6 | #6f91a4 | 1 |
| MapPin | 67 | 28 | 4 | 2.6 | #6f91a4 | 1 |

### 14. Newborn Girl / بشارة الأميرة

- Source: `newborn_girl.jpg` (4500×8000)
- Reference: `14.jpg` (4500×8000; ratio difference 0.000%)
- Categories: `baby_shower`
- Assessment: Measured from numbered reference and tuned in the first proof pass.
- Proof: [compare-14-newborn_girl.png](template-audit-corrected/proofs/compare-14-newborn_girl.png)

#### Fields

| key | type | label EN | label AR | placeholder EN | placeholder AR | required | rows | max length |
|---|---|---|---|---|---|---|---:|---:|
| `invitationMessage` | textarea | Invitation Message | رسالة الدعوة | e.g. We are honoured to invite you… | مثل: يتشرف بدعوتكم لحضور… | no | 3 | 120 |
| `babyName` | text | Baby Name | اسم المولود | e.g. Hossam | مثل حسام | yes | — | 40 |
| `babyNameLatin` | text | Baby Name (Latin) | اسم المولود بالإنجليزية | e.g. Yara | مثال: Yara | no | — | 40 |
| `closingMessage` | text | Closing Message | العبارة الختامية | e.g. Your presence completes our joy | مثل: بحضوركم تكتمل فرحتنا | no | — | 100 |
| `eventDate` | date | Date | التاريخ |  |  | yes | — | — |
| `eventTime` | time | Time | الوقت |  |  | yes | — | — |
| `venue` | text | Venue | المكان | e.g. Riyadh, Hilton Hall | مثل الرياض، قاعة هيلتون | yes | — | 80 |
| `primaryColor` | color | Primary Colour | اللون الأساسي |  |  | no | — | — |
| `fontFamily` | font | Font | الخط |  |  | no | — | — |

#### Overlays

| field | top % | left % | width % | font vh | line height | max lines | weight | align | colour binding | colour | font | z |
|---|---:|---:|---:|---:|---:|---:|---|---|---|---|---|---:|
| `invitationMessage` | 22 | 50 | 72 | 2 | 1.35 | 3 | 500 | center | custom | #9c9a62 | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `babyName` | 40 | 50 | 58 | 6 | 1.35 | 1 | 700 | center | custom | #ef8eb4 | var(--font-amiri), 'Amiri', serif | 2 |
| `babyNameLatin` | 48 | 50 | 55 | 2.1 | 1.35 | 1 | 400 | center | custom | #ef8eb4 | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `closingMessage` | 57 | 50 | 72 | 2 | 1.35 | 2 | 500 | center | custom | #9c9a62 | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventDate` | 70.5 | 72 | 23 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventTime` | 70.5 | 50 | 18 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `venue` | 70.5 | 28 | 24 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |

#### Decorations

| icon/type | top % | left % | width % | size vh | colour | z |
|---|---:|---:|---:|---:|---|---:|
| CalendarDays | 66 | 72 | 4 | 2.6 | #d98ca9 | 1 |
| Clock | 66 | 50 | 4 | 2.6 | #d98ca9 | 1 |
| MapPin | 66 | 28 | 4 | 2.6 | #d98ca9 | 1 |

### 15. Graduation Celebration / حفل تخرج

- Source: `marriage_contract_bronze.jpg` (4500×8000)
- Reference: `15.png` (4500×8000; ratio difference 0.000%)
- Categories: `general_event`
- Assessment: BLOCKED: the supplied source artwork does not match reference 15; field hierarchy is ready but visual approval requires the correct blank background.
- Proof: [compare-15-marriage_contract_bronze.png](template-audit-corrected/proofs/compare-15-marriage_contract_bronze.png)

#### Fields

| key | type | label EN | label AR | placeholder EN | placeholder AR | required | rows | max length |
|---|---|---|---|---|---|---|---:|---:|
| `invitationMessage` | textarea | Invitation Message | رسالة الدعوة | e.g. We are honoured to invite you… | مثل: يتشرف بدعوتكم لحضور… | no | 3 | 100 |
| `celebrantName` | text | Celebrant | صاحب المناسبة | e.g. Layan | مثل ليان | yes | — | 60 |
| `eventNote` | text | Event Note | عبارة المناسبة | e.g. We would be delighted by your presence | مثل: يسعدنا ويشرفنا حضوركم | no | — | 90 |
| `eventDate` | date | Date | التاريخ |  |  | yes | — | — |
| `eventTime` | time | Time | الوقت |  |  | yes | — | — |
| `venue` | text | Venue | المكان | e.g. Riyadh, Hilton Hall | مثل الرياض، قاعة هيلتون | yes | — | 80 |
| `primaryColor` | color | Primary Colour | اللون الأساسي |  |  | no | — | — |
| `fontFamily` | font | Font | الخط |  |  | no | — | — |

#### Overlays

| field | top % | left % | width % | font vh | line height | max lines | weight | align | colour binding | colour | font | z |
|---|---:|---:|---:|---:|---:|---:|---|---|---|---|---|---:|
| `invitationMessage` | 22 | 50 | 66 | 2.1 | 1.35 | 2 | 400 | center | custom | #54262b | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `celebrantName` | 38 | 50 | 60 | 6 | 1.35 | 1 | 700 | center | custom | #63232c | var(--font-amiri), 'Amiri', serif | 2 |
| `eventNote` | 48 | 50 | 62 | 2 | 1.35 | 1 | 400 | center | custom | #54262b | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventDate` | 60.5 | 72 | 23 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventTime` | 60.5 | 50 | 18 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `venue` | 60.5 | 28 | 24 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |

#### Decorations

| icon/type | top % | left % | width % | size vh | colour | z |
|---|---:|---:|---:|---:|---|---:|
| CalendarDays | 56 | 72 | 4 | 2.6 | #7d3e43 | 1 |
| Clock | 56 | 50 | 4 | 2.6 | #7d3e43 | 1 |
| MapPin | 56 | 28 | 4 | 2.6 | #7d3e43 | 1 |

### 16. Pearl Promise / خطوبة لؤلؤية

- Source: `engagement_pearl.jpg` (4500×8000)
- Reference: `16.png` (4500×8000; ratio difference 0.000%)
- Categories: `engagement`
- Assessment: Measured from numbered reference and tuned in the first proof pass.
- Proof: [compare-16-engagement_pearl.png](template-audit-corrected/proofs/compare-16-engagement_pearl.png)

#### Fields

| key | type | label EN | label AR | placeholder EN | placeholder AR | required | rows | max length |
|---|---|---|---|---|---|---|---:|---:|
| `groomNameLatin` | text | Groom Name (Latin) | اسم العريس بالإنجليزية | e.g. Khalid | مثال: Khalid | no | — | 40 |
| `brideNameLatin` | text | Bride Name (Latin) | اسم العروس بالإنجليزية | e.g. Sara | مثال: Sara | no | — | 40 |
| `invitationMessage` | textarea | Invitation Message | رسالة الدعوة | e.g. We are honoured to invite you… | مثل: يتشرف بدعوتكم لحضور… | no | 3 | 100 |
| `groomName` | text | Groom | العريس | e.g. Khalid | مثل: خالد | yes | — | 40 |
| `brideName` | text | Bride | العروس | e.g. Sara Al-Qahtani | مثل سارة القحطاني | yes | — | 60 |
| `openingVerse` | text | Opening Verse | الآية | e.g. Quranic verse or short blessing | مثل: آية قرآنية أو دعاء قصير | no | — | 160 |
| `eventDate` | date | Date | التاريخ |  |  | yes | — | — |
| `eventTime` | time | Time | الوقت |  |  | yes | — | — |
| `venue` | text | Venue | المكان | e.g. Riyadh, Hilton Hall | مثل الرياض، قاعة هيلتون | yes | — | 80 |
| `primaryColor` | color | Primary Colour | اللون الأساسي |  |  | no | — | — |
| `fontFamily` | font | Font | الخط |  |  | no | — | — |

#### Overlays

| field | top % | left % | width % | font vh | line height | max lines | weight | align | colour binding | colour | font | z |
|---|---:|---:|---:|---:|---:|---:|---|---|---|---|---|---:|
| `groomNameLatin` | 25 | 42 | 30 | 1.8 | 1.35 | 1 | 400 | center | custom | #8a876d | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `brideNameLatin` | 25 | 58 | 30 | 1.8 | 1.35 | 1 | 400 | center | custom | #8a876d | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `invitationMessage` | 34 | 50 | 72 | 2 | 1.35 | 2 | 400 | center | custom | #8a876d | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `groomName` | 49 | 68 | 30 | 5.2 | 1.35 | 1 | 700 | center | custom | #8a876d | var(--font-amiri), 'Amiri', serif | 2 |
| `brideName` | 49 | 32 | 30 | 5.2 | 1.35 | 1 | 700 | center | custom | #8a876d | var(--font-amiri), 'Amiri', serif | 2 |
| `openingVerse` | 61 | 50 | 78 | 2.2 | 1.35 | 2 | 600 | center | custom | #8a876d | var(--font-amiri), 'Amiri', serif | 2 |
| `eventDate` | 74.5 | 72 | 23 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventTime` | 74.5 | 50 | 18 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `venue` | 74.5 | 28 | 24 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |

#### Decorations

| icon/type | top % | left % | width % | size vh | colour | z |
|---|---:|---:|---:|---:|---|---:|
| CalendarDays | 70 | 72 | 4 | 2.6 | #8a876d | 1 |
| Clock | 70 | 50 | 4 | 2.6 | #8a876d | 1 |
| MapPin | 70 | 28 | 4 | 2.6 | #8a876d | 1 |

### 17. Navy Frame Wedding / فرح الإطار الكحلي

- Source: `wedding_navy_frame.jpg` (4500×8000)
- Reference: none (no numbered reference; layout is proposed)
- Categories: `wedding`
- Assessment: Proposed from the closest referenced sibling; requires visual approval.
- Proof: [compare-17-wedding_navy_frame.png](template-audit-corrected/proofs/compare-17-wedding_navy_frame.png)

#### Fields

| key | type | label EN | label AR | placeholder EN | placeholder AR | required | rows | max length |
|---|---|---|---|---|---|---|---:|---:|
| `openingVerse` | text | Opening Verse | الآية | e.g. Quranic verse or short blessing | مثل: آية قرآنية أو دعاء قصير | no | — | 160 |
| `invitationMessage` | textarea | Invitation Message | رسالة الدعوة | e.g. We are honoured to invite you… | مثل: يتشرف بدعوتكم لحضور… | no | 3 | 150 |
| `hostName` | text | Host | المضيف | e.g. Abu Mohammad | مثل أبو محمد | no | — | 60 |
| `eventNote` | text | Event Note | عبارة المناسبة | e.g. We would be delighted by your presence | مثل: يسعدنا ويشرفنا حضوركم | no | — | 90 |
| `groomName` | text | Groom | العريس | e.g. Khalid | مثل: خالد | yes | — | 40 |
| `closingMessage` | text | Closing Message | العبارة الختامية | e.g. Your presence completes our joy | مثل: بحضوركم تكتمل فرحتنا | no | — | 100 |
| `eventDate` | date | Date | التاريخ |  |  | yes | — | — |
| `eventTime` | time | Time | الوقت |  |  | yes | — | — |
| `venue` | text | Venue | المكان | e.g. Riyadh, Hilton Hall | مثل الرياض، قاعة هيلتون | yes | — | 80 |
| `primaryColor` | color | Primary Colour | اللون الأساسي |  |  | no | — | — |
| `fontFamily` | font | Font | الخط |  |  | no | — | — |

#### Overlays

| field | top % | left % | width % | font vh | line height | max lines | weight | align | colour binding | colour | font | z |
|---|---:|---:|---:|---:|---:|---:|---|---|---|---|---|---:|
| `openingVerse` | 27 | 50 | 68 | 3 | 1.35 | 1 | 700 | center | custom | #ead9ab | var(--font-amiri), 'Amiri', serif | 2 |
| `invitationMessage` | 38 | 50 | 76 | 2.1 | 1.45 | 3 | 400 | center | custom | #ead9ab | var(--font-amiri), 'Amiri', serif | 2 |
| `hostName` | 49 | 50 | 66 | 2.8 | 1.35 | 1 | 600 | center | custom | #ead9ab | var(--font-amiri), 'Amiri', serif | 2 |
| `eventNote` | 54 | 50 | 66 | 2 | 1.35 | 1 | 400 | center | custom | #ead9ab | var(--font-amiri), 'Amiri', serif | 2 |
| `groomName` | 64 | 50 | 62 | 5.6 | 1.35 | 1 | 700 | center | custom | #ead9ab | var(--font-amiri), 'Amiri', serif | 2 |
| `closingMessage` | 72 | 50 | 62 | 2 | 1.35 | 1 | 400 | center | custom | #ead9ab | var(--font-amiri), 'Amiri', serif | 2 |
| `eventDate` | 84.5 | 72 | 23 | 1.8 | 1.2 | 2 | 500 | center | custom | #ead9ab | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventTime` | 84.5 | 50 | 18 | 1.8 | 1.2 | 2 | 500 | center | custom | #ead9ab | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `venue` | 84.5 | 28 | 24 | 1.8 | 1.2 | 2 | 500 | center | custom | #ead9ab | var(--font-cairo), 'Cairo', sans-serif | 2 |

#### Decorations

| icon/type | top % | left % | width % | size vh | colour | z |
|---|---:|---:|---:|---:|---|---:|
| CalendarDays | 80 | 72 | 4 | 2.6 | #ead9ab | 1 |
| Clock | 80 | 50 | 4 | 2.6 | #ead9ab | 1 |
| MapPin | 80 | 28 | 4 | 2.6 | #ead9ab | 1 |

### 18. White Frame Wedding / فرح الإطار اللؤلؤي

- Source: `wedding_white_frame.jpg` (4500×8000)
- Reference: none (no numbered reference; layout is proposed)
- Categories: `wedding`
- Assessment: Proposed from the closest referenced sibling; requires visual approval.
- Proof: [compare-18-wedding_white_frame.png](template-audit-corrected/proofs/compare-18-wedding_white_frame.png)

#### Fields

| key | type | label EN | label AR | placeholder EN | placeholder AR | required | rows | max length |
|---|---|---|---|---|---|---|---:|---:|
| `openingVerse` | text | Opening Verse | الآية | e.g. Quranic verse or short blessing | مثل: آية قرآنية أو دعاء قصير | no | — | 160 |
| `invitationMessage` | textarea | Invitation Message | رسالة الدعوة | e.g. We are honoured to invite you… | مثل: يتشرف بدعوتكم لحضور… | no | 3 | 150 |
| `hostName` | text | Host | المضيف | e.g. Abu Mohammad | مثل أبو محمد | no | — | 60 |
| `eventNote` | text | Event Note | عبارة المناسبة | e.g. We would be delighted by your presence | مثل: يسعدنا ويشرفنا حضوركم | no | — | 90 |
| `groomName` | text | Groom | العريس | e.g. Khalid | مثل: خالد | yes | — | 40 |
| `closingMessage` | text | Closing Message | العبارة الختامية | e.g. Your presence completes our joy | مثل: بحضوركم تكتمل فرحتنا | no | — | 100 |
| `eventDate` | date | Date | التاريخ |  |  | yes | — | — |
| `eventTime` | time | Time | الوقت |  |  | yes | — | — |
| `venue` | text | Venue | المكان | e.g. Riyadh, Hilton Hall | مثل الرياض، قاعة هيلتون | yes | — | 80 |
| `primaryColor` | color | Primary Colour | اللون الأساسي |  |  | no | — | — |
| `fontFamily` | font | Font | الخط |  |  | no | — | — |

#### Overlays

| field | top % | left % | width % | font vh | line height | max lines | weight | align | colour binding | colour | font | z |
|---|---:|---:|---:|---:|---:|---:|---|---|---|---|---|---:|
| `openingVerse` | 27 | 50 | 68 | 3 | 1.35 | 1 | 700 | center | primary | — | var(--font-amiri), 'Amiri', serif | 2 |
| `invitationMessage` | 38 | 50 | 76 | 2.1 | 1.45 | 3 | 400 | center | primary | — | var(--font-amiri), 'Amiri', serif | 2 |
| `hostName` | 49 | 50 | 66 | 2.8 | 1.35 | 1 | 600 | center | primary | — | var(--font-amiri), 'Amiri', serif | 2 |
| `eventNote` | 54 | 50 | 66 | 2 | 1.35 | 1 | 400 | center | primary | — | var(--font-amiri), 'Amiri', serif | 2 |
| `groomName` | 64 | 50 | 62 | 5.6 | 1.35 | 1 | 700 | center | primary | — | var(--font-amiri), 'Amiri', serif | 2 |
| `closingMessage` | 72 | 50 | 62 | 2 | 1.35 | 1 | 400 | center | primary | — | var(--font-amiri), 'Amiri', serif | 2 |
| `eventDate` | 84.5 | 72 | 23 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventTime` | 84.5 | 50 | 18 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `venue` | 84.5 | 28 | 24 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |

#### Decorations

| icon/type | top % | left % | width % | size vh | colour | z |
|---|---:|---:|---:|---:|---|---:|
| CalendarDays | 80 | 72 | 4 | 2.6 | #274866 | 1 |
| Clock | 80 | 50 | 4 | 2.6 | #274866 | 1 |
| MapPin | 80 | 28 | 4 | 2.6 | #274866 | 1 |

### 19. Sacred Pilgrimage / بشارة الحج

- Source: `general_pilgrimage.jpg` (4500×8000)
- Reference: none (no numbered reference; layout is proposed)
- Categories: `general_event`
- Assessment: Proposed from the closest referenced sibling; requires visual approval.
- Proof: [compare-19-general_pilgrimage.png](template-audit-corrected/proofs/compare-19-general_pilgrimage.png)

#### Fields

| key | type | label EN | label AR | placeholder EN | placeholder AR | required | rows | max length |
|---|---|---|---|---|---|---|---:|---:|
| `invitationTitle` | text | Invitation Title | عنوان الدعوة | e.g. "Invitation" | مثل: "دعوة" | no | — | 30 |
| `invitationMessage` | textarea | Invitation Message | رسالة الدعوة | e.g. We are honoured to invite you… | مثل: يتشرف بدعوتكم لحضور… | no | 3 | 110 |
| `eventTitle` | text | Event Title | عنوان المناسبة | e.g. Eid Gathering | مثل تجمع العيد | yes | — | 80 |
| `closingMessage` | text | Closing Message | العبارة الختامية | e.g. Your presence completes our joy | مثل: بحضوركم تكتمل فرحتنا | no | — | 100 |
| `eventDate` | date | Date | التاريخ |  |  | yes | — | — |
| `eventTime` | time | Time | الوقت |  |  | yes | — | — |
| `venue` | text | Venue | المكان | e.g. Riyadh, Hilton Hall | مثل الرياض، قاعة هيلتون | yes | — | 80 |
| `primaryColor` | color | Primary Colour | اللون الأساسي |  |  | no | — | — |
| `fontFamily` | font | Font | الخط |  |  | no | — | — |

#### Overlays

| field | top % | left % | width % | font vh | line height | max lines | weight | align | colour binding | colour | font | z |
|---|---:|---:|---:|---:|---:|---:|---|---|---|---|---|---:|
| `invitationTitle` | 14 | 50 | 54 | 4.4 | 1.35 | 1 | 700 | center | custom | #124537 | var(--font-amiri), 'Amiri', serif | 2 |
| `invitationMessage` | 26 | 50 | 72 | 2.1 | 1.35 | 3 | 400 | center | custom | #124537 | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventTitle` | 50 | 50 | 62 | 4.6 | 1.35 | 1 | 700 | center | custom | #f4e8c8 | var(--font-amiri), 'Amiri', serif | 2 |
| `closingMessage` | 61 | 50 | 70 | 2.2 | 1.35 | 1 | 500 | center | custom | #124537 | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventDate` | 73.5 | 72 | 23 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventTime` | 73.5 | 50 | 18 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `venue` | 73.5 | 28 | 24 | 1.8 | 1.2 | 2 | 500 | center | primary | — | var(--font-cairo), 'Cairo', sans-serif | 2 |

#### Decorations

| icon/type | top % | left % | width % | size vh | colour | z |
|---|---:|---:|---:|---:|---|---:|
| CalendarDays | 69 | 72 | 4 | 2.6 | #124537 | 1 |
| Clock | 69 | 50 | 4 | 2.6 | #124537 | 1 |
| MapPin | 69 | 28 | 4 | 2.6 | #124537 | 1 |

### 20. Visionary Conference / مؤتمر القادة

- Source: `conference.jpg` (4500×8000)
- Reference: none (no numbered reference; layout is proposed)
- Categories: `conference`
- Assessment: Proposed from the closest referenced sibling; requires visual approval.
- Proof: [compare-20-conference.png](template-audit-corrected/proofs/compare-20-conference.png)

#### Fields

| key | type | label EN | label AR | placeholder EN | placeholder AR | required | rows | max length |
|---|---|---|---|---|---|---|---:|---:|
| `eventTitle` | text | Event Title | عنوان المناسبة | e.g. Eid Gathering | مثل تجمع العيد | yes | — | 80 |
| `invitationMessage` | textarea | Invitation Message | رسالة الدعوة | e.g. We are honoured to invite you… | مثل: يتشرف بدعوتكم لحضور… | no | 3 | 120 |
| `hostName` | text | Host | المضيف | e.g. Abu Mohammad | مثل أبو محمد | no | — | 60 |
| `eventDate` | date | Date | التاريخ |  |  | yes | — | — |
| `eventTime` | time | Time | الوقت |  |  | yes | — | — |
| `venue` | text | Venue | المكان | e.g. Riyadh, Hilton Hall | مثل الرياض، قاعة هيلتون | yes | — | 80 |
| `primaryColor` | color | Primary Colour | اللون الأساسي |  |  | no | — | — |
| `fontFamily` | font | Font | الخط |  |  | no | — | — |

#### Overlays

| field | top % | left % | width % | font vh | line height | max lines | weight | align | colour binding | colour | font | z |
|---|---:|---:|---:|---:|---:|---:|---|---|---|---|---|---:|
| `eventTitle` | 22 | 28 | 48 | 4.8 | 1.35 | 2 | 700 | right | custom | #f2deaa | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `invitationMessage` | 37 | 28 | 48 | 2.1 | 1.35 | 3 | 400 | right | custom | #f2deaa | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `hostName` | 50 | 28 | 44 | 2.5 | 1.35 | 1 | 600 | center | custom | #f2deaa | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventDate` | 70.5 | 72 | 23 | 1.8 | 1.2 | 2 | 500 | center | custom | #f2deaa | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `eventTime` | 70.5 | 50 | 18 | 1.8 | 1.2 | 2 | 500 | center | custom | #f2deaa | var(--font-cairo), 'Cairo', sans-serif | 2 |
| `venue` | 70.5 | 28 | 24 | 1.8 | 1.2 | 2 | 500 | center | custom | #f2deaa | var(--font-cairo), 'Cairo', sans-serif | 2 |

#### Decorations

| icon/type | top % | left % | width % | size vh | colour | z |
|---|---:|---:|---:|---:|---|---:|
| CalendarDays | 66 | 72 | 4 | 2.6 | #f2deaa | 1 |
| Clock | 66 | 50 | 4 | 2.6 | #f2deaa | 1 |
| MapPin | 66 | 28 | 4 | 2.6 | #f2deaa | 1 |

## Migration readiness

- `renameFreshTemplateCards.js`: applied successfully to the 20 fresh downloads; dry-run remains safe for future batches.
- `updateTemplateCardsPrecision.js`: dry-run found exactly one live row for each source and reports 20 id-preserving updates. `--apply` is required for DB writes; `--replace-images` additionally requires `--apply`.
- `migrateEventTemplateFieldKeys.js`: dry-run scanned three dependent events and would add canonical aliases without deleting legacy values.
- `renderTemplateCardProofs.js`: generated 20 local proofs without DB/S3 access.

## Remaining approval blocker

Reference 15 and `marriage_contract_bronze.jpg` are different artwork. Do not apply Card 15 as visually approved until its matching blank source is supplied or the decision is made to use the available bronze background with the proposed graduation hierarchy.

