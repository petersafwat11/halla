# Halaa WhatsApp Invitation Catalog — 140 Templates

> **Superseded after copy audit:** use
> [`TAQNYAT_META_INVITATION_TEMPLATE_CATALOG_V3.md`](./TAQNYAT_META_INVITATION_TEMPLATE_CATALOG_V3.md),
> which applies the five frozen voices and removes the robotic language patterns identified in review.

**Purpose:** a production-ready Arabic copy catalog for submission to Meta through Taqnyat and assignment in Halaa.

**Version:** 2.0  
**Language:** Arabic (`ar`)  
**Application type:** `invite`  
**Coverage:** 7 categories × 5 creative directions × 4 invitation modes = **140 templates**

---

## 1. How this catalog is designed

Each category offers five genuinely different creative directions. They are not cosmetic rewrites: each direction serves a different event possibility, audience, and taste. Every direction is then produced in Halaa's four functional invitation modes.

| Mode | Meta controls | Guest experience |
|---|---|---|
| `reply_and_qr` | `سأحضر`, `سأعتذر`, `ربما` | The guest replies; confirmation triggers delivery of their entry QR. |
| `reply_only` | `سأحضر`, `سأعتذر`, `ربما` | The guest replies; no QR is issued. |
| `qr_only` | Dynamic URL button `عرض رمز الدخول` | The guest opens their personal entry pass directly. |
| `none` | No buttons | Informational invitation with no RSVP and no QR. |

### Common submission configuration

| Field | Value |
|---|---|
| Meta category | `UTILITY` with `allow_category_change: true` |
| Language | `ar` |
| Header | `IMAGE` |
| Footer | `هلا — دعوات تليق بمناسبتك` |
| Halaa type after sync | `invite` |

Meta may reclassify invitation content. Accept Meta's final classification instead of resubmitting unchanged copy repeatedly.

### Body variables

Every body uses the same five variables in the same order:

| Placeholder | Halaa source key | Example |
|---|---|---|
| `{{1}}` | `guest.name` | `عبدالله الشهري` |
| `{{2}}` | `eventDetails.title` | The event title |
| `{{3}}` | `eventDetails.dateFormatted` | `الجمعة 15 أغسطس 2026` |
| `{{4}}` | `eventDetails.time` | `8:30 مساءً` |
| `{{5}}` | `eventDetails.location.address` | `قاعة ليلتي، جدة` |

For every `qr_only` template, register the dynamic URL as:

```text
https://halaa.sa/ar/invitation/{{1}}
```

The URL `{{1}}` is a separate button parameter. Confirm the final production domain before submission.

### Creative-direction overview

| Category | Direction 1 | Direction 2 | Direction 3 | Direction 4 | Direction 5 |
|---|---|---|---|---|---|
| الزفاف `wedding` | الدعوة الدافئة | الدعوة الكلاسيكية | الدعوة العصرية | الدعوة الحميمة | الدعوة الأصيلة |
| الخطوبة `engagement` | الفرحة القريبة | الدعوة الراقية | البداية الجميلة | الخبر الجميل | دعوة العائلتين |
| عيد الميلاد `birthday` | الاحتفال المرح | حفلة الأطفال | الاحتفال الأنيق | الحفلة المفاجئة | الاحتفال العائلي |
| استقبال المولود `baby_shower` | فرحة الوصول | احتفال ما قبل الوصول | دعوة العقيقة | الاستقبال الراقي | بين الأهل والأصدقاء |
| المناسبة النسائية `ladies_event` | الأمسية الدافئة | ليلة العروس | الدعوة النسائية الراقية | لقاء الصديقات | الأمسية الأصيلة |
| المناسبة العامة `general_event` | الدعوة المرنة | اللقاء العائلي | الإنجاز | المناسبة الموسمية | البداية الجديدة |
| المؤتمر `conference` | الدعوة التنفيذية | ملتقى الابتكار | ورشة العمل | الندوة المعرفية | لقاء التواصل |

---

## 2. Wedding — الزفاف `wedding`

### 2.1 الدعوة الدافئة — `warm`

**Best for:** عائلية، قريبة من القلب، ومناسبة لمعظم حفلات الزفاف.

**Meta sample event title:** `حفل زفاف أحمد ونورة`

#### 2.1.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_wedding_warm_reply_qr_ar_v1`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا {{1}}،

هناك ليالٍ تبقى في الذاكرة، وهذه واحدة منها. يسعدنا حضورك في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستشاركنا هذه الفرحة؟ عند تأكيد حضورك، سيصلك رمز الدخول الخاص بك.
بانتظارك، فبك تكتمل فرحتنا 🤍
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 2.1.2 رد فقط — `reply_only`

- **Meta name:** `halaa_wedding_warm_reply_only_ar_v1`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا {{1}}،

هناك ليالٍ تبقى في الذاكرة، وهذه واحدة منها. يسعدنا حضورك في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستشاركنا هذه الفرحة؟
بانتظارك، فبك تكتمل فرحتنا 🤍
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 2.1.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_wedding_warm_qr_only_ar_v1`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا {{1}}،

هناك ليالٍ تبقى في الذاكرة، وهذه واحدة منها. يسعدنا حضورك في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

رمز دخولك الخاص متاح عبر الزر المرفق لاستخدامه عند الوصول.
بانتظارك، فبك تكتمل فرحتنا 🤍
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 2.1.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_wedding_warm_none_ar_v1`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا {{1}}،

هناك ليالٍ تبقى في الذاكرة، وهذه واحدة منها. يسعدنا حضورك في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

بانتظارك، فبك تكتمل فرحتنا 🤍
```

**Buttons:** none

---

### 2.2 الدعوة الكلاسيكية — `classic`

**Best for:** رسمية راقية للعائلات وحفلات القاعات الكبيرة.

**Meta sample event title:** `حفل زفاف خالد وسارة`

#### 2.2.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_wedding_classic_reply_qr_ar_v1`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا بك {{1}}،

بكل التقدير، نتشرّف بدعوتك إلى {{2}}، ويسعدنا أن تشاركنا هذه المناسبة الغالية.
وذلك يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل نتشرّف بحضورك؟ بعد تأكيد حضورك، ستصلك بطاقة الدخول الخاصة بك.
حضورك موضع تقديرنا، ويسعدنا أن نرحّب بك.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 2.2.2 رد فقط — `reply_only`

- **Meta name:** `halaa_wedding_classic_reply_only_ar_v1`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا بك {{1}}،

بكل التقدير، نتشرّف بدعوتك إلى {{2}}، ويسعدنا أن تشاركنا هذه المناسبة الغالية.
وذلك يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل نتشرّف بحضورك؟
حضورك موضع تقديرنا، ويسعدنا أن نرحّب بك.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 2.2.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_wedding_classic_qr_only_ar_v1`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا بك {{1}}،

بكل التقدير، نتشرّف بدعوتك إلى {{2}}، ويسعدنا أن تشاركنا هذه المناسبة الغالية.
وذلك يوم {{3}}، عند الساعة {{4}}، في {{5}}.

بطاقة دخولك متاحة عبر الزر المرفق، وستُستخدم عند الوصول.
حضورك موضع تقديرنا، ويسعدنا أن نرحّب بك.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 2.2.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_wedding_classic_none_ar_v1`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا بك {{1}}،

بكل التقدير، نتشرّف بدعوتك إلى {{2}}، ويسعدنا أن تشاركنا هذه المناسبة الغالية.
وذلك يوم {{3}}، عند الساعة {{4}}، في {{5}}.

حضورك موضع تقديرنا، ويسعدنا أن نرحّب بك.
```

**Buttons:** none

---

### 2.3 الدعوة العصرية — `modern`

**Best for:** خفيفة وأنيقة للأزواج الذين يفضّلون لغة حديثة.

**Meta sample event title:** `ليلة زفاف فيصل ولين`

#### 2.3.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_wedding_modern_reply_qr_ar_v1`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
يا هلا {{1}} 🤍

موعدنا مع ليلة جميلة، وأنت من الأشخاص الذين نود أن يكونوا معنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستكون معنا؟ إذا أكدت حضورك، سيصلك رمز الدخول مباشرة.
ننتظرك لنصنع معًا ذكرى لا تُنسى.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 2.3.2 رد فقط — `reply_only`

- **Meta name:** `halaa_wedding_modern_reply_only_ar_v1`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
يا هلا {{1}} 🤍

موعدنا مع ليلة جميلة، وأنت من الأشخاص الذين نود أن يكونوا معنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستكون معنا؟
ننتظرك لنصنع معًا ذكرى لا تُنسى.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 2.3.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_wedding_modern_qr_only_ar_v1`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
يا هلا {{1}} 🤍

موعدنا مع ليلة جميلة، وأنت من الأشخاص الذين نود أن يكونوا معنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

ستجد رمز دخولك في الزر المرفق، جاهزًا للاستخدام عند وصولك.
ننتظرك لنصنع معًا ذكرى لا تُنسى.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 2.3.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_wedding_modern_none_ar_v1`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `none`

**Body**

```text
يا هلا {{1}} 🤍

موعدنا مع ليلة جميلة، وأنت من الأشخاص الذين نود أن يكونوا معنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

ننتظرك لنصنع معًا ذكرى لا تُنسى.
```

**Buttons:** none

---

### 2.4 الدعوة الحميمة — `intimate`

**Best for:** هادئة وشخصية لحفلات الزفاف الصغيرة والمقرّبة.

**Meta sample event title:** `حفل زفاف عمر ومها`

#### 2.4.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_wedding_intimate_reply_qr_ar_v1`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا {{1}}،

هذه الدعوة لك لأنك جزء من فرحتنا، ويسعدنا أن تشاركنا {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستُكمل فرحتنا بحضورك؟ عند تأكيد حضورك، سنرسل لك رمز الدخول الخاص بك.
قربك يعني لنا الكثير، وننتظر حضورك بكل محبة.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 2.4.2 رد فقط — `reply_only`

- **Meta name:** `halaa_wedding_intimate_reply_only_ar_v1`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا {{1}}،

هذه الدعوة لك لأنك جزء من فرحتنا، ويسعدنا أن تشاركنا {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستُكمل فرحتنا بحضورك؟
قربك يعني لنا الكثير، وننتظر حضورك بكل محبة.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 2.4.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_wedding_intimate_qr_only_ar_v1`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا {{1}}،

هذه الدعوة لك لأنك جزء من فرحتنا، ويسعدنا أن تشاركنا {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

رمز دخولك محفوظ لك في الزر المرفق لاستخدامه عند الوصول.
قربك يعني لنا الكثير، وننتظر حضورك بكل محبة.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 2.4.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_wedding_intimate_none_ar_v1`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا {{1}}،

هذه الدعوة لك لأنك جزء من فرحتنا، ويسعدنا أن تشاركنا {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

قربك يعني لنا الكثير، وننتظر حضورك بكل محبة.
```

**Buttons:** none

---

### 2.5 الدعوة الأصيلة — `heritage`

**Best for:** بروح الضيافة الخليجية ولغة عائلية تقليدية.

**Meta sample event title:** `ليلة زفاف عبدالله والجوهرة`

#### 2.5.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_wedding_heritage_reply_qr_ar_v1`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
حيّاك الله {{1}}،

بكل الود، تتشرّف العائلة بدعوتك إلى {{2}}، ومشاركتنا ليلةً عزيزة على قلوبنا.
موعدنا يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل نتشرّف بحضورك؟ بعد تأكيد حضورك، سيصلك رمز الدخول المخصّص لك.
حضورك شرف وسرور، ولقاؤك يسعدنا.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 2.5.2 رد فقط — `reply_only`

- **Meta name:** `halaa_wedding_heritage_reply_only_ar_v1`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
حيّاك الله {{1}}،

بكل الود، تتشرّف العائلة بدعوتك إلى {{2}}، ومشاركتنا ليلةً عزيزة على قلوبنا.
موعدنا يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل نتشرّف بحضورك؟
حضورك شرف وسرور، ولقاؤك يسعدنا.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 2.5.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_wedding_heritage_qr_only_ar_v1`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
حيّاك الله {{1}}،

بكل الود، تتشرّف العائلة بدعوتك إلى {{2}}، ومشاركتنا ليلةً عزيزة على قلوبنا.
موعدنا يوم {{3}}، عند الساعة {{4}}، في {{5}}.

رمز دخولك المخصّص لك موجود في الزر المرفق لاستخدامه عند الوصول.
حضورك شرف وسرور، ولقاؤك يسعدنا.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 2.5.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_wedding_heritage_none_ar_v1`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `none`

**Body**

```text
حيّاك الله {{1}}،

بكل الود، تتشرّف العائلة بدعوتك إلى {{2}}، ومشاركتنا ليلةً عزيزة على قلوبنا.
موعدنا يوم {{3}}، عند الساعة {{4}}، في {{5}}.

حضورك شرف وسرور، ولقاؤك يسعدنا.
```

**Buttons:** none

---

## 3. Engagement — الخطوبة `engagement`

### 3.1 الفرحة القريبة — `heartfelt`

**Best for:** دافئة وعاطفية لمشاركة الخبر مع المقرّبين.

**Meta sample event title:** `حفل خطوبة خالد وسارة`

#### 3.1.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_engagement_heartfelt_reply_qr_ar_v1`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا {{1}}،

نشاركك اليوم فرحةً قريبة من القلب، ويسعدنا أن تكون معنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستكون معنا؟ عند تأكيد حضورك، سيصلك رمز الدخول الخاص بك.
وجودك سيجعل هذه المناسبة أجمل 🤍
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 3.1.2 رد فقط — `reply_only`

- **Meta name:** `halaa_engagement_heartfelt_reply_only_ar_v1`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا {{1}}،

نشاركك اليوم فرحةً قريبة من القلب، ويسعدنا أن تكون معنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستكون معنا؟
وجودك سيجعل هذه المناسبة أجمل 🤍
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 3.1.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_engagement_heartfelt_qr_only_ar_v1`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا {{1}}،

نشاركك اليوم فرحةً قريبة من القلب، ويسعدنا أن تكون معنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

رمز دخولك الخاص متاح عبر الزر المرفق لاستخدامه عند الوصول.
وجودك سيجعل هذه المناسبة أجمل 🤍
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 3.1.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_engagement_heartfelt_none_ar_v1`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا {{1}}،

نشاركك اليوم فرحةً قريبة من القلب، ويسعدنا أن تكون معنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

وجودك سيجعل هذه المناسبة أجمل 🤍
```

**Buttons:** none

---

### 3.2 الدعوة الراقية — `elegant`

**Best for:** رسمية متوازنة لحفلات الخطوبة الراقية.

**Meta sample event title:** `حفل خطوبة راشد وريم`

#### 3.2.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_engagement_elegant_reply_qr_ar_v1`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا بك {{1}}،

يسرّنا أن نشاركك مناسبةً عزيزة، ونتشرّف بدعوتك إلى {{2}}.
وذلك يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل نتشرّف بحضورك؟ بعد تأكيد حضورك، ستصلك بطاقة الدخول الخاصة بك.
يسعدنا حضورك ومشاركتك لنا هذه البداية الجميلة.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 3.2.2 رد فقط — `reply_only`

- **Meta name:** `halaa_engagement_elegant_reply_only_ar_v1`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا بك {{1}}،

يسرّنا أن نشاركك مناسبةً عزيزة، ونتشرّف بدعوتك إلى {{2}}.
وذلك يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل نتشرّف بحضورك؟
يسعدنا حضورك ومشاركتك لنا هذه البداية الجميلة.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 3.2.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_engagement_elegant_qr_only_ar_v1`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا بك {{1}}،

يسرّنا أن نشاركك مناسبةً عزيزة، ونتشرّف بدعوتك إلى {{2}}.
وذلك يوم {{3}}، عند الساعة {{4}}، في {{5}}.

بطاقة دخولك متاحة عبر الزر المرفق لتقديمها عند الوصول.
يسعدنا حضورك ومشاركتك لنا هذه البداية الجميلة.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 3.2.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_engagement_elegant_none_ar_v1`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا بك {{1}}،

يسرّنا أن نشاركك مناسبةً عزيزة، ونتشرّف بدعوتك إلى {{2}}.
وذلك يوم {{3}}، عند الساعة {{4}}، في {{5}}.

يسعدنا حضورك ومشاركتك لنا هذه البداية الجميلة.
```

**Buttons:** none

---

### 3.3 البداية الجميلة — `modern`

**Best for:** عصرية وخفيفة لجيل يفضّل رسالة بسيطة وواضحة.

**Meta sample event title:** `ليلة خطوبة نواف ودانة`

#### 3.3.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_engagement_modern_reply_qr_ar_v1`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
يا هلا {{1}} ✨

بدأت حكاية جميلة، ويسعدنا أن تشاركنا أول فصولها في {{2}}.
موعدنا يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستشاركنا البداية؟ إذا أكدت حضورك، سيصلك رمز الدخول مباشرة.
ننتظرك لنحتفل معًا ببداية تستحق الفرح.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 3.3.2 رد فقط — `reply_only`

- **Meta name:** `halaa_engagement_modern_reply_only_ar_v1`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
يا هلا {{1}} ✨

بدأت حكاية جميلة، ويسعدنا أن تشاركنا أول فصولها في {{2}}.
موعدنا يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستشاركنا البداية؟
ننتظرك لنحتفل معًا ببداية تستحق الفرح.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 3.3.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_engagement_modern_qr_only_ar_v1`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
يا هلا {{1}} ✨

بدأت حكاية جميلة، ويسعدنا أن تشاركنا أول فصولها في {{2}}.
موعدنا يوم {{3}}، عند الساعة {{4}}، في {{5}}.

رمز دخولك جاهز في الزر المرفق لاستخدامه عند وصولك.
ننتظرك لنحتفل معًا ببداية تستحق الفرح.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 3.3.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_engagement_modern_none_ar_v1`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `none`

**Body**

```text
يا هلا {{1}} ✨

بدأت حكاية جميلة، ويسعدنا أن تشاركنا أول فصولها في {{2}}.
موعدنا يوم {{3}}، عند الساعة {{4}}، في {{5}}.

ننتظرك لنحتفل معًا ببداية تستحق الفرح.
```

**Buttons:** none

---

### 3.4 الخبر الجميل — `intimate`

**Best for:** شخصية وهادئة للأصدقاء والعائلة المقرّبة.

**Meta sample event title:** `خطوبة سامي ولطيفة`

#### 3.4.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_engagement_intimate_reply_qr_ar_v1`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا {{1}}،

لدينا خبر جميل، وأردنا أن نشاركك فرحته في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستشاركنا هذا اليوم؟ عند تأكيد حضورك، سنرسل لك رمز الدخول الخاص بك.
قربك في هذه المناسبة يعني لنا الكثير 🤍
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 3.4.2 رد فقط — `reply_only`

- **Meta name:** `halaa_engagement_intimate_reply_only_ar_v1`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا {{1}}،

لدينا خبر جميل، وأردنا أن نشاركك فرحته في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستشاركنا هذا اليوم؟
قربك في هذه المناسبة يعني لنا الكثير 🤍
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 3.4.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_engagement_intimate_qr_only_ar_v1`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا {{1}}،

لدينا خبر جميل، وأردنا أن نشاركك فرحته في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

ستجد رمز دخولك الخاص في الزر المرفق لاستخدامه عند الوصول.
قربك في هذه المناسبة يعني لنا الكثير 🤍
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 3.4.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_engagement_intimate_none_ar_v1`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا {{1}}،

لدينا خبر جميل، وأردنا أن نشاركك فرحته في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

قربك في هذه المناسبة يعني لنا الكثير 🤍
```

**Buttons:** none

---

### 3.5 دعوة العائلتين — `family`

**Best for:** تقليدية محترمة عندما تصدر الدعوة باسم العائلتين.

**Meta sample event title:** `حفل خطوبة أبناء العائلتين`

#### 3.5.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_engagement_family_reply_qr_ar_v1`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
حيّاك الله {{1}}،

بمشاعر الفرح والسرور، تتشرّف العائلتان بدعوتك إلى {{2}}.
وذلك يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل نتشرّف بحضورك؟ بعد تأكيد حضورك، سيصلك رمز الدخول المخصّص لك.
حضورك يسعد العائلتين ويزيد المناسبة بهجة.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 3.5.2 رد فقط — `reply_only`

- **Meta name:** `halaa_engagement_family_reply_only_ar_v1`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
حيّاك الله {{1}}،

بمشاعر الفرح والسرور، تتشرّف العائلتان بدعوتك إلى {{2}}.
وذلك يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل نتشرّف بحضورك؟
حضورك يسعد العائلتين ويزيد المناسبة بهجة.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 3.5.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_engagement_family_qr_only_ar_v1`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
حيّاك الله {{1}}،

بمشاعر الفرح والسرور، تتشرّف العائلتان بدعوتك إلى {{2}}.
وذلك يوم {{3}}، عند الساعة {{4}}، في {{5}}.

رمز دخولك المخصّص لك متاح عبر الزر المرفق.
حضورك يسعد العائلتين ويزيد المناسبة بهجة.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 3.5.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_engagement_family_none_ar_v1`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `none`

**Body**

```text
حيّاك الله {{1}}،

بمشاعر الفرح والسرور، تتشرّف العائلتان بدعوتك إلى {{2}}.
وذلك يوم {{3}}، عند الساعة {{4}}، في {{5}}.

حضورك يسعد العائلتين ويزيد المناسبة بهجة.
```

**Buttons:** none

---

## 4. Birthday — عيد الميلاد `birthday`

### 4.1 الاحتفال المرح — `joyful`

**Best for:** مرحة وعصرية لأعياد الميلاد بين الأصدقاء.

**Meta sample event title:** `عيد ميلاد ليان`

#### 4.1.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_birthday_joyful_reply_qr_ar_v1`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
يا هلا {{1}} 🎈

سنحتفل معًا في {{2}}، وما تحلى الحفلة إلا بوجود من نحب.
ننتظرك يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستحتفل معنا؟ عند تأكيد حضورك، سيصلك رمز الدخول الخاص بك.
وجودك أجمل هدية 🎈
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 4.1.2 رد فقط — `reply_only`

- **Meta name:** `halaa_birthday_joyful_reply_only_ar_v1`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
يا هلا {{1}} 🎈

سنحتفل معًا في {{2}}، وما تحلى الحفلة إلا بوجود من نحب.
ننتظرك يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستحتفل معنا؟
وجودك أجمل هدية 🎈
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 4.1.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_birthday_joyful_qr_only_ar_v1`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
يا هلا {{1}} 🎈

سنحتفل معًا في {{2}}، وما تحلى الحفلة إلا بوجود من نحب.
ننتظرك يوم {{3}}، عند الساعة {{4}}، في {{5}}.

رمز دخولك موجود في الزر المرفق، وسيكون جاهزًا عند وصولك.
وجودك أجمل هدية 🎈
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 4.1.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_birthday_joyful_none_ar_v1`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `none`

**Body**

```text
يا هلا {{1}} 🎈

سنحتفل معًا في {{2}}، وما تحلى الحفلة إلا بوجود من نحب.
ننتظرك يوم {{3}}، عند الساعة {{4}}، في {{5}}.

وجودك أجمل هدية 🎈
```

**Buttons:** none

---

### 4.2 حفلة الأطفال — `kids`

**Best for:** مرحة وملوّنة لأعياد ميلاد الأطفال.

**Meta sample event title:** `عيد ميلاد يوسف الخامس`

#### 4.2.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_birthday_kids_reply_qr_ar_v1`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
يا هلا {{1}} 🥳

البالونات جاهزة، والكعكة تنتظر، ولم يبقَ إلا حضورك في {{2}}.
تبدأ المغامرة يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستنضم إلى المرح؟ بعد تأكيد حضورك، سيصلك رمز الدخول الخاص بالحفلة.
ننتظرك ليكتمل الضحك واللعب 🎉
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 4.2.2 رد فقط — `reply_only`

- **Meta name:** `halaa_birthday_kids_reply_only_ar_v1`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
يا هلا {{1}} 🥳

البالونات جاهزة، والكعكة تنتظر، ولم يبقَ إلا حضورك في {{2}}.
تبدأ المغامرة يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستنضم إلى المرح؟
ننتظرك ليكتمل الضحك واللعب 🎉
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 4.2.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_birthday_kids_qr_only_ar_v1`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
يا هلا {{1}} 🥳

البالونات جاهزة، والكعكة تنتظر، ولم يبقَ إلا حضورك في {{2}}.
تبدأ المغامرة يوم {{3}}، عند الساعة {{4}}، في {{5}}.

رمز دخول الحفلة متاح في الزر المرفق لاستخدامه عند الوصول.
ننتظرك ليكتمل الضحك واللعب 🎉
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 4.2.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_birthday_kids_none_ar_v1`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `none`

**Body**

```text
يا هلا {{1}} 🥳

البالونات جاهزة، والكعكة تنتظر، ولم يبقَ إلا حضورك في {{2}}.
تبدأ المغامرة يوم {{3}}، عند الساعة {{4}}، في {{5}}.

ننتظرك ليكتمل الضحك واللعب 🎉
```

**Buttons:** none

---

### 4.3 الاحتفال الأنيق — `adult`

**Best for:** هادئة وناضجة لأعياد ميلاد الكبار.

**Meta sample event title:** `أمسية عيد ميلاد نورة`

#### 4.3.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_birthday_adult_reply_qr_ar_v1`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا {{1}}،

عام جديد وذكريات جديدة تستحق أن تبدأ بصحبة جميلة. يسعدنا حضورك في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستشاركنا هذه الأمسية؟ عند تأكيد حضورك، ستصلك بطاقة الدخول الخاصة بك.
وجودك سيمنح هذا الاحتفال معنى أجمل.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 4.3.2 رد فقط — `reply_only`

- **Meta name:** `halaa_birthday_adult_reply_only_ar_v1`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا {{1}}،

عام جديد وذكريات جديدة تستحق أن تبدأ بصحبة جميلة. يسعدنا حضورك في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستشاركنا هذه الأمسية؟
وجودك سيمنح هذا الاحتفال معنى أجمل.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 4.3.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_birthday_adult_qr_only_ar_v1`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا {{1}}،

عام جديد وذكريات جديدة تستحق أن تبدأ بصحبة جميلة. يسعدنا حضورك في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

بطاقة دخولك متاحة عبر الزر المرفق لاستخدامها عند الوصول.
وجودك سيمنح هذا الاحتفال معنى أجمل.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 4.3.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_birthday_adult_none_ar_v1`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا {{1}}،

عام جديد وذكريات جديدة تستحق أن تبدأ بصحبة جميلة. يسعدنا حضورك في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

وجودك سيمنح هذا الاحتفال معنى أجمل.
```

**Buttons:** none

---

### 4.4 الحفلة المفاجئة — `surprise`

**Best for:** مرحة لحفلات المفاجأة مع تنبيه لطيف للحفاظ على السر.

**Meta sample event title:** `حفلة عيد ميلاد مفاجئة لسلمان`

#### 4.4.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_birthday_surprise_reply_qr_ar_v1`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
يا هلا {{1}} 🤫

لدينا مفاجأة جميلة ونريدك جزءًا منها. ندعوك إلى {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستساعدنا في إنجاح المفاجأة؟ عند تأكيد حضورك، سيصلك رمز الدخول الخاص بك.
وصولك في الموعد جزء من المفاجأة—والسر بيننا! 🎉
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 4.4.2 رد فقط — `reply_only`

- **Meta name:** `halaa_birthday_surprise_reply_only_ar_v1`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
يا هلا {{1}} 🤫

لدينا مفاجأة جميلة ونريدك جزءًا منها. ندعوك إلى {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستساعدنا في إنجاح المفاجأة؟
وصولك في الموعد جزء من المفاجأة—والسر بيننا! 🎉
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 4.4.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_birthday_surprise_qr_only_ar_v1`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
يا هلا {{1}} 🤫

لدينا مفاجأة جميلة ونريدك جزءًا منها. ندعوك إلى {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

رمز دخولك موجود في الزر المرفق لاستخدامه عند الوصول.
وصولك في الموعد جزء من المفاجأة—والسر بيننا! 🎉
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 4.4.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_birthday_surprise_none_ar_v1`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `none`

**Body**

```text
يا هلا {{1}} 🤫

لدينا مفاجأة جميلة ونريدك جزءًا منها. ندعوك إلى {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

وصولك في الموعد جزء من المفاجأة—والسر بيننا! 🎉
```

**Buttons:** none

---

### 4.5 الاحتفال العائلي — `family`

**Best for:** حميمة وبسيطة لأعياد الميلاد العائلية.

**Meta sample event title:** `عيد ميلاد الوالدة`

#### 4.5.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_birthday_family_reply_qr_ar_v1`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا {{1}}،

أجمل أعياد الميلاد هي التي تجمعنا بمن نحب، ويسعدنا أن تكون معنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستشاركنا هذه الفرحة العائلية؟ بعد تأكيد حضورك، سيصلك رمز الدخول الخاص بك.
بانتظارك، فوجودك هو ما يجعل اللقاء أجمل.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 4.5.2 رد فقط — `reply_only`

- **Meta name:** `halaa_birthday_family_reply_only_ar_v1`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا {{1}}،

أجمل أعياد الميلاد هي التي تجمعنا بمن نحب، ويسعدنا أن تكون معنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستشاركنا هذه الفرحة العائلية؟
بانتظارك، فوجودك هو ما يجعل اللقاء أجمل.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 4.5.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_birthday_family_qr_only_ar_v1`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا {{1}}،

أجمل أعياد الميلاد هي التي تجمعنا بمن نحب، ويسعدنا أن تكون معنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

ستجد رمز دخولك في الزر المرفق لاستخدامه عند وصولك.
بانتظارك، فوجودك هو ما يجعل اللقاء أجمل.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 4.5.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_birthday_family_none_ar_v1`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا {{1}}،

أجمل أعياد الميلاد هي التي تجمعنا بمن نحب، ويسعدنا أن تكون معنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

بانتظارك، فوجودك هو ما يجعل اللقاء أجمل.
```

**Buttons:** none

---

## 5. Baby shower — استقبال المولود `baby_shower`

### 5.1 فرحة الوصول — `warm`

**Best for:** دافئة لاستقبال المولود بعد وصوله.

**Meta sample event title:** `استقبال مولودنا يوسف`

#### 5.1.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_baby_shower_warm_reply_qr_ar_v1`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا {{1}}،

كبرت فرحتنا بقدوم صغيرنا، والأجمل أن نشاركها معك في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستشاركنا هذه الفرحة؟ عند تأكيد حضورك، سيصلك رمز الدخول الخاص بك.
ننتظرك بمحبة، فوجودك يعني لنا الكثير 🤍
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 5.1.2 رد فقط — `reply_only`

- **Meta name:** `halaa_baby_shower_warm_reply_only_ar_v1`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا {{1}}،

كبرت فرحتنا بقدوم صغيرنا، والأجمل أن نشاركها معك في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستشاركنا هذه الفرحة؟
ننتظرك بمحبة، فوجودك يعني لنا الكثير 🤍
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 5.1.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_baby_shower_warm_qr_only_ar_v1`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا {{1}}،

كبرت فرحتنا بقدوم صغيرنا، والأجمل أن نشاركها معك في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

رمز دخولك الخاص متاح عبر الزر المرفق لاستخدامه عند الوصول.
ننتظرك بمحبة، فوجودك يعني لنا الكثير 🤍
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 5.1.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_baby_shower_warm_none_ar_v1`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا {{1}}،

كبرت فرحتنا بقدوم صغيرنا، والأجمل أن نشاركها معك في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

ننتظرك بمحبة، فوجودك يعني لنا الكثير 🤍
```

**Buttons:** none

---

### 5.2 احتفال ما قبل الوصول — `shower`

**Best for:** لطيفة ومرحة لحفلات الـBaby Shower.

**Meta sample event title:** `حفل استقبال صغيرنا القادم`

#### 5.2.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_baby_shower_shower_reply_qr_ar_v1`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
يا هلا {{1}} 🧸

تفاصيل صغيرة وفرحة كبيرة في الطريق، ويسعدنا حضورك في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستكون معنا لنحتفل بهذه الفرحة؟ عند تأكيد حضورك، سيصلك رمز الدخول الخاص بالحفل.
بانتظارك لنحتفل معًا بالضيف الصغير 🤍
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 5.2.2 رد فقط — `reply_only`

- **Meta name:** `halaa_baby_shower_shower_reply_only_ar_v1`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
يا هلا {{1}} 🧸

تفاصيل صغيرة وفرحة كبيرة في الطريق، ويسعدنا حضورك في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستكون معنا لنحتفل بهذه الفرحة؟
بانتظارك لنحتفل معًا بالضيف الصغير 🤍
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 5.2.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_baby_shower_shower_qr_only_ar_v1`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
يا هلا {{1}} 🧸

تفاصيل صغيرة وفرحة كبيرة في الطريق، ويسعدنا حضورك في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

رمز دخول الحفل موجود في الزر المرفق لاستخدامه عند الوصول.
بانتظارك لنحتفل معًا بالضيف الصغير 🤍
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 5.2.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_baby_shower_shower_none_ar_v1`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `none`

**Body**

```text
يا هلا {{1}} 🧸

تفاصيل صغيرة وفرحة كبيرة في الطريق، ويسعدنا حضورك في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

بانتظارك لنحتفل معًا بالضيف الصغير 🤍
```

**Buttons:** none

---

### 5.3 دعوة العقيقة — `aqiqah`

**Best for:** روحانية وعائلية للعقيقة ومناسبات الشكر.

**Meta sample event title:** `عقيقة مولودنا عبدالله`

#### 5.3.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_baby_shower_aqiqah_reply_qr_ar_v1`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا {{1}}،

حمدًا لله على تمام النعمة واكتمال الفرحة. يسرّنا دعوتك إلى {{2}}.
وذلك يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستشاركنا هذه النعمة؟ بعد تأكيد حضورك، سيصلك رمز الدخول المخصّص لك.
نسعد بحضورك ودعواتك الطيبة للمولود.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 5.3.2 رد فقط — `reply_only`

- **Meta name:** `halaa_baby_shower_aqiqah_reply_only_ar_v1`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا {{1}}،

حمدًا لله على تمام النعمة واكتمال الفرحة. يسرّنا دعوتك إلى {{2}}.
وذلك يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستشاركنا هذه النعمة؟
نسعد بحضورك ودعواتك الطيبة للمولود.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 5.3.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_baby_shower_aqiqah_qr_only_ar_v1`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا {{1}}،

حمدًا لله على تمام النعمة واكتمال الفرحة. يسرّنا دعوتك إلى {{2}}.
وذلك يوم {{3}}، عند الساعة {{4}}، في {{5}}.

رمز دخولك المخصّص لك متاح عبر الزر المرفق.
نسعد بحضورك ودعواتك الطيبة للمولود.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 5.3.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_baby_shower_aqiqah_none_ar_v1`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا {{1}}،

حمدًا لله على تمام النعمة واكتمال الفرحة. يسرّنا دعوتك إلى {{2}}.
وذلك يوم {{3}}، عند الساعة {{4}}، في {{5}}.

نسعد بحضورك ودعواتك الطيبة للمولود.
```

**Buttons:** none

---

### 5.4 الاستقبال الراقي — `elegant`

**Best for:** ناعمة ورسمية لحفلات الاستقبال الراقية.

**Meta sample event title:** `استقبال مولودتنا جود`

#### 5.4.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_baby_shower_elegant_reply_qr_ar_v1`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا بك {{1}}،

بفرحٍ يملأ القلب، يسرّنا أن تشاركنا {{2}}.
نستقبلك يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل نتشرّف بحضورك؟ عند تأكيد حضورك، ستصلك بطاقة الدخول الخاصة بك.
حضورك يضيف لهذه المناسبة فرحةً لا تُنسى.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 5.4.2 رد فقط — `reply_only`

- **Meta name:** `halaa_baby_shower_elegant_reply_only_ar_v1`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا بك {{1}}،

بفرحٍ يملأ القلب، يسرّنا أن تشاركنا {{2}}.
نستقبلك يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل نتشرّف بحضورك؟
حضورك يضيف لهذه المناسبة فرحةً لا تُنسى.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 5.4.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_baby_shower_elegant_qr_only_ar_v1`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا بك {{1}}،

بفرحٍ يملأ القلب، يسرّنا أن تشاركنا {{2}}.
نستقبلك يوم {{3}}، عند الساعة {{4}}، في {{5}}.

بطاقة دخولك متاحة عبر الزر المرفق لاستخدامها عند الوصول.
حضورك يضيف لهذه المناسبة فرحةً لا تُنسى.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 5.4.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_baby_shower_elegant_none_ar_v1`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا بك {{1}}،

بفرحٍ يملأ القلب، يسرّنا أن تشاركنا {{2}}.
نستقبلك يوم {{3}}، عند الساعة {{4}}، في {{5}}.

حضورك يضيف لهذه المناسبة فرحةً لا تُنسى.
```

**Buttons:** none

---

### 5.5 بين الأهل والأصدقاء — `intimate`

**Best for:** حميمة جدًا للقاءات الصغيرة في المنزل.

**Meta sample event title:** `لقاء الأحبة بمناسبة قدوم صغيرنا`

#### 5.5.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_baby_shower_intimate_reply_qr_ar_v1`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
يا هلا {{1}} 🤍

صغيرنا محاط بالمحبة منذ يومه الأول، ونود أن نشاركك فرحتنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستكون معنا؟ إذا أكدت حضورك، سيصلك رمز الدخول الخاص بك.
ننتظرك بشوق لتشاركنا هذه اللحظة العائلية.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 5.5.2 رد فقط — `reply_only`

- **Meta name:** `halaa_baby_shower_intimate_reply_only_ar_v1`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
يا هلا {{1}} 🤍

صغيرنا محاط بالمحبة منذ يومه الأول، ونود أن نشاركك فرحتنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستكون معنا؟
ننتظرك بشوق لتشاركنا هذه اللحظة العائلية.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 5.5.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_baby_shower_intimate_qr_only_ar_v1`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
يا هلا {{1}} 🤍

صغيرنا محاط بالمحبة منذ يومه الأول، ونود أن نشاركك فرحتنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

ستجد رمز دخولك في الزر المرفق لاستخدامه عند وصولك.
ننتظرك بشوق لتشاركنا هذه اللحظة العائلية.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 5.5.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_baby_shower_intimate_none_ar_v1`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `none`

**Body**

```text
يا هلا {{1}} 🤍

صغيرنا محاط بالمحبة منذ يومه الأول، ونود أن نشاركك فرحتنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

ننتظرك بشوق لتشاركنا هذه اللحظة العائلية.
```

**Buttons:** none

---

## 6. Ladies' event — المناسبة النسائية `ladies_event`

### 6.1 الأمسية الدافئة — `warm`

**Best for:** مرحّبة وودودة للتجمعات النسائية العامة.

**Meta sample event title:** `أمسية الورد`

#### 6.1.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_ladies_event_warm_reply_qr_ar_v1`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
يا هلا {{1}} ✨

أعددنا أمسية جميلة نود أن نقضيها بصحبة من نحب، ويسعدنا أن تكوني معنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستكونين معنا؟ عند تأكيد حضورك، سيصلك رمز الدخول الخاص بك.
وجودك سيضيف للأمسية فرحة خاصة ✨
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 6.1.2 رد فقط — `reply_only`

- **Meta name:** `halaa_ladies_event_warm_reply_only_ar_v1`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
يا هلا {{1}} ✨

أعددنا أمسية جميلة نود أن نقضيها بصحبة من نحب، ويسعدنا أن تكوني معنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستكونين معنا؟
وجودك سيضيف للأمسية فرحة خاصة ✨
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 6.1.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_ladies_event_warm_qr_only_ar_v1`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
يا هلا {{1}} ✨

أعددنا أمسية جميلة نود أن نقضيها بصحبة من نحب، ويسعدنا أن تكوني معنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

رمز دخولك موجود في الزر المرفق، وستحتاجين إليه عند الوصول.
وجودك سيضيف للأمسية فرحة خاصة ✨
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 6.1.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_ladies_event_warm_none_ar_v1`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `none`

**Body**

```text
يا هلا {{1}} ✨

أعددنا أمسية جميلة نود أن نقضيها بصحبة من نحب، ويسعدنا أن تكوني معنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

وجودك سيضيف للأمسية فرحة خاصة ✨
```

**Buttons:** none

---

### 6.2 ليلة العروس — `bride`

**Best for:** احتفالية للحناء ووداع العزوبية وليالي العروس.

**Meta sample event title:** `ليلة حناء العروس دانة`

#### 6.2.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_ladies_event_bride_reply_qr_ar_v1`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
يا هلا {{1}} 🤍

لدينا ليلة للعروس، مليئة بالفرح والتفاصيل الجميلة، ونريدك معنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستشاركيننا فرحة العروس؟ عند تأكيد حضورك، سيصلك رمز الدخول الخاص بك.
قربك من العروس سيجعل ليلتها أجمل.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 6.2.2 رد فقط — `reply_only`

- **Meta name:** `halaa_ladies_event_bride_reply_only_ar_v1`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
يا هلا {{1}} 🤍

لدينا ليلة للعروس، مليئة بالفرح والتفاصيل الجميلة، ونريدك معنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستشاركيننا فرحة العروس؟
قربك من العروس سيجعل ليلتها أجمل.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 6.2.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_ladies_event_bride_qr_only_ar_v1`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
يا هلا {{1}} 🤍

لدينا ليلة للعروس، مليئة بالفرح والتفاصيل الجميلة، ونريدك معنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

رمز دخولك متاح في الزر المرفق لاستخدامه عند وصولك.
قربك من العروس سيجعل ليلتها أجمل.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 6.2.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_ladies_event_bride_none_ar_v1`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `none`

**Body**

```text
يا هلا {{1}} 🤍

لدينا ليلة للعروس، مليئة بالفرح والتفاصيل الجميلة، ونريدك معنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

قربك من العروس سيجعل ليلتها أجمل.
```

**Buttons:** none

---

### 6.3 الدعوة النسائية الراقية — `elegant`

**Best for:** رسمية أنيقة للأمسيات وحفلات الاستقبال.

**Meta sample event title:** `أمسية أناقة وإلهام`

#### 6.3.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_ladies_event_elegant_reply_qr_ar_v1`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا {{1}}،

يسرّنا دعوتك إلى أمسية مختارة بعناية، ونعتز بأن تكوني ضيفتنا في {{2}}.
وذلك يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل نتشرّف بحضورك؟ بعد تأكيد حضورك، ستصلك بطاقة الدخول الخاصة بك.
حضورك موضع تقديرنا، ونتطلع إلى الترحيب بك.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 6.3.2 رد فقط — `reply_only`

- **Meta name:** `halaa_ladies_event_elegant_reply_only_ar_v1`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا {{1}}،

يسرّنا دعوتك إلى أمسية مختارة بعناية، ونعتز بأن تكوني ضيفتنا في {{2}}.
وذلك يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل نتشرّف بحضورك؟
حضورك موضع تقديرنا، ونتطلع إلى الترحيب بك.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 6.3.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_ladies_event_elegant_qr_only_ar_v1`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا {{1}}،

يسرّنا دعوتك إلى أمسية مختارة بعناية، ونعتز بأن تكوني ضيفتنا في {{2}}.
وذلك يوم {{3}}، عند الساعة {{4}}، في {{5}}.

بطاقة دخولك متاحة عبر الزر المرفق لتقديمها عند الوصول.
حضورك موضع تقديرنا، ونتطلع إلى الترحيب بك.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 6.3.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_ladies_event_elegant_none_ar_v1`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا {{1}}،

يسرّنا دعوتك إلى أمسية مختارة بعناية، ونعتز بأن تكوني ضيفتنا في {{2}}.
وذلك يوم {{3}}، عند الساعة {{4}}، في {{5}}.

حضورك موضع تقديرنا، ونتطلع إلى الترحيب بك.
```

**Buttons:** none

---

### 6.4 لقاء الصديقات — `friends`

**Best for:** خفيفة وعفوية للقاءات الصديقات والجلسات الخاصة.

**Meta sample event title:** `لقاء الصديقات`

#### 6.4.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_ladies_event_friends_reply_qr_ar_v1`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
يا هلا {{1}} 💫

نحتاج إلى مساء خفيف، وضحكات كثيرة، وصحبة نحبها. مكانك معنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستنضمين إلينا؟ إذا أكدتِ حضورك، سيصلك رمز الدخول الخاص بك.
لا يكتمل اللقاء من دونك 💛
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 6.4.2 رد فقط — `reply_only`

- **Meta name:** `halaa_ladies_event_friends_reply_only_ar_v1`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
يا هلا {{1}} 💫

نحتاج إلى مساء خفيف، وضحكات كثيرة، وصحبة نحبها. مكانك معنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستنضمين إلينا؟
لا يكتمل اللقاء من دونك 💛
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 6.4.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_ladies_event_friends_qr_only_ar_v1`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
يا هلا {{1}} 💫

نحتاج إلى مساء خفيف، وضحكات كثيرة، وصحبة نحبها. مكانك معنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

رمز دخولك جاهز في الزر المرفق لاستخدامه عند وصولك.
لا يكتمل اللقاء من دونك 💛
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 6.4.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_ladies_event_friends_none_ar_v1`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `none`

**Body**

```text
يا هلا {{1}} 💫

نحتاج إلى مساء خفيف، وضحكات كثيرة، وصحبة نحبها. مكانك معنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

لا يكتمل اللقاء من دونك 💛
```

**Buttons:** none

---

### 6.5 الأمسية الأصيلة — `heritage`

**Best for:** بروح الضيافة والأصالة للمناسبات التراثية.

**Meta sample event title:** `ليلة تراث وأصالة`

#### 6.5.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_ladies_event_heritage_reply_qr_ar_v1`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
حيّاكِ الله {{1}}،

في أمسية تجمع الود والأصالة، يسعدنا أن تكوني ضيفتنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل نتشرّف بحضورك؟ بعد تأكيد حضورك، سيصلك رمز الدخول المخصّص لك.
حضورك يزيد الأمسية بهجة، ولقاؤك يسعدنا.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 6.5.2 رد فقط — `reply_only`

- **Meta name:** `halaa_ladies_event_heritage_reply_only_ar_v1`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
حيّاكِ الله {{1}}،

في أمسية تجمع الود والأصالة، يسعدنا أن تكوني ضيفتنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل نتشرّف بحضورك؟
حضورك يزيد الأمسية بهجة، ولقاؤك يسعدنا.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 6.5.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_ladies_event_heritage_qr_only_ar_v1`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
حيّاكِ الله {{1}}،

في أمسية تجمع الود والأصالة، يسعدنا أن تكوني ضيفتنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

رمز دخولك المخصّص لك متاح في الزر المرفق.
حضورك يزيد الأمسية بهجة، ولقاؤك يسعدنا.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 6.5.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_ladies_event_heritage_none_ar_v1`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `none`

**Body**

```text
حيّاكِ الله {{1}}،

في أمسية تجمع الود والأصالة، يسعدنا أن تكوني ضيفتنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

حضورك يزيد الأمسية بهجة، ولقاؤك يسعدنا.
```

**Buttons:** none

---

## 7. General event — المناسبة العامة `general_event`

### 7.1 الدعوة المرنة — `warm`

**Best for:** دافئة ومحايدة وتناسب معظم المناسبات العامة.

**Meta sample event title:** `لقاء الأحبة`

#### 7.1.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_general_event_warm_reply_qr_ar_v1`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا {{1}}،

لدينا لقاء نود أن نشاركك تفاصيله، ويسرّنا دعوتك إلى {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستكون معنا؟ عند تأكيد حضورك، سيصلك رمز الدخول الخاص بك.
بانتظارك، فوجودك يجعل اللقاء أجمل.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 7.1.2 رد فقط — `reply_only`

- **Meta name:** `halaa_general_event_warm_reply_only_ar_v1`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا {{1}}،

لدينا لقاء نود أن نشاركك تفاصيله، ويسرّنا دعوتك إلى {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستكون معنا؟
بانتظارك، فوجودك يجعل اللقاء أجمل.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 7.1.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_general_event_warm_qr_only_ar_v1`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا {{1}}،

لدينا لقاء نود أن نشاركك تفاصيله، ويسرّنا دعوتك إلى {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

رمز دخولك الخاص متاح عبر الزر المرفق لاستخدامه عند الوصول.
بانتظارك، فوجودك يجعل اللقاء أجمل.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 7.1.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_general_event_warm_none_ar_v1`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا {{1}}،

لدينا لقاء نود أن نشاركك تفاصيله، ويسرّنا دعوتك إلى {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

بانتظارك، فوجودك يجعل اللقاء أجمل.
```

**Buttons:** none

---

### 7.2 اللقاء العائلي — `family`

**Best for:** للتجمعات العائلية ولمّات الأقارب.

**Meta sample event title:** `لقاء العائلة السنوي`

#### 7.2.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_general_event_family_reply_qr_ar_v1`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا {{1}}،

تجمعنا الأيام، لكن للّمة العائلة فرحة مختلفة. يسعدنا حضورك في {{2}}.
موعدنا يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستشاركنا هذه اللمّة؟ بعد تأكيد حضورك، سيصلك رمز الدخول الخاص بك.
مكانك محفوظ بين أهلك، وننتظر حضورك بمحبة.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 7.2.2 رد فقط — `reply_only`

- **Meta name:** `halaa_general_event_family_reply_only_ar_v1`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا {{1}}،

تجمعنا الأيام، لكن للّمة العائلة فرحة مختلفة. يسعدنا حضورك في {{2}}.
موعدنا يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستشاركنا هذه اللمّة؟
مكانك محفوظ بين أهلك، وننتظر حضورك بمحبة.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 7.2.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_general_event_family_qr_only_ar_v1`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا {{1}}،

تجمعنا الأيام، لكن للّمة العائلة فرحة مختلفة. يسعدنا حضورك في {{2}}.
موعدنا يوم {{3}}، عند الساعة {{4}}، في {{5}}.

ستجد رمز دخولك في الزر المرفق لاستخدامه عند وصولك.
مكانك محفوظ بين أهلك، وننتظر حضورك بمحبة.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 7.2.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_general_event_family_none_ar_v1`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا {{1}}،

تجمعنا الأيام، لكن للّمة العائلة فرحة مختلفة. يسعدنا حضورك في {{2}}.
موعدنا يوم {{3}}، عند الساعة {{4}}، في {{5}}.

مكانك محفوظ بين أهلك، وننتظر حضورك بمحبة.
```

**Buttons:** none

---

### 7.3 الإنجاز — `achievement`

**Best for:** للتخرج والتكريم والنجاحات الشخصية والمهنية.

**Meta sample event title:** `حفل تخرج سارة`

#### 7.3.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_general_event_achievement_reply_qr_ar_v1`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا {{1}}،

هناك إنجاز يستحق أن نحتفل به مع من شاركونا الطريق. ندعوك إلى {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستشاركنا لحظة الإنجاز؟ عند تأكيد حضورك، ستصلك بطاقة الدخول الخاصة بك.
حضورك جزء جميل من هذه اللحظة التي انتظرناها.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 7.3.2 رد فقط — `reply_only`

- **Meta name:** `halaa_general_event_achievement_reply_only_ar_v1`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا {{1}}،

هناك إنجاز يستحق أن نحتفل به مع من شاركونا الطريق. ندعوك إلى {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستشاركنا لحظة الإنجاز؟
حضورك جزء جميل من هذه اللحظة التي انتظرناها.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 7.3.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_general_event_achievement_qr_only_ar_v1`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا {{1}}،

هناك إنجاز يستحق أن نحتفل به مع من شاركونا الطريق. ندعوك إلى {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

بطاقة دخولك متاحة عبر الزر المرفق لاستخدامها عند الوصول.
حضورك جزء جميل من هذه اللحظة التي انتظرناها.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 7.3.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_general_event_achievement_none_ar_v1`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا {{1}}،

هناك إنجاز يستحق أن نحتفل به مع من شاركونا الطريق. ندعوك إلى {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

حضورك جزء جميل من هذه اللحظة التي انتظرناها.
```

**Buttons:** none

---

### 7.4 المناسبة الموسمية — `seasonal`

**Best for:** للأعياد والقرقيعان والإفطار والاحتفالات الموسمية.

**Meta sample event title:** `لقاء عيد الفطر`

#### 7.4.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_general_event_seasonal_reply_qr_ar_v1`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
يا هلا {{1}} 🌙

للمواسم فرحتها، والأجمل أن نتشاركها مع من نحب. يسعدنا حضورك في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستشاركنا فرحة الموسم؟ إذا أكدت حضورك، سيصلك رمز الدخول الخاص بك.
بانتظارك، وكل عام وأنت بخير.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 7.4.2 رد فقط — `reply_only`

- **Meta name:** `halaa_general_event_seasonal_reply_only_ar_v1`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
يا هلا {{1}} 🌙

للمواسم فرحتها، والأجمل أن نتشاركها مع من نحب. يسعدنا حضورك في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستشاركنا فرحة الموسم؟
بانتظارك، وكل عام وأنت بخير.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 7.4.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_general_event_seasonal_qr_only_ar_v1`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
يا هلا {{1}} 🌙

للمواسم فرحتها، والأجمل أن نتشاركها مع من نحب. يسعدنا حضورك في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

رمز دخولك جاهز في الزر المرفق لاستخدامه عند وصولك.
بانتظارك، وكل عام وأنت بخير.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 7.4.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_general_event_seasonal_none_ar_v1`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `none`

**Body**

```text
يا هلا {{1}} 🌙

للمواسم فرحتها، والأجمل أن نتشاركها مع من نحب. يسعدنا حضورك في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

بانتظارك، وكل عام وأنت بخير.
```

**Buttons:** none

---

### 7.5 البداية الجديدة — `milestone`

**Best for:** لافتتاح منزل أو تقاعد أو انتقال أو محطة جديدة.

**Meta sample event title:** `حفل افتتاح منزلنا الجديد`

#### 7.5.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_general_event_milestone_reply_qr_ar_v1`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا {{1}}،

نبدأ فصلًا جديدًا، ويسعدنا أن تشاركنا أول ذكرياته في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستشاركنا هذه البداية؟ عند تأكيد حضورك، سيصلك رمز الدخول الخاص بك.
وجودك يمنح هذه البداية معنى أجمل.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 7.5.2 رد فقط — `reply_only`

- **Meta name:** `halaa_general_event_milestone_reply_only_ar_v1`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا {{1}}،

نبدأ فصلًا جديدًا، ويسعدنا أن تشاركنا أول ذكرياته في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستشاركنا هذه البداية؟
وجودك يمنح هذه البداية معنى أجمل.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 7.5.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_general_event_milestone_qr_only_ar_v1`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا {{1}}،

نبدأ فصلًا جديدًا، ويسعدنا أن تشاركنا أول ذكرياته في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

ستجد رمز دخولك الخاص في الزر المرفق لاستخدامه عند الوصول.
وجودك يمنح هذه البداية معنى أجمل.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 7.5.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_general_event_milestone_none_ar_v1`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا {{1}}،

نبدأ فصلًا جديدًا، ويسعدنا أن تشاركنا أول ذكرياته في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

وجودك يمنح هذه البداية معنى أجمل.
```

**Buttons:** none

---

## 8. Conference — المؤتمر `conference`

### 8.1 الدعوة التنفيذية — `executive`

**Best for:** رسمية للمؤتمرات والملتقيات الكبرى.

**Meta sample event title:** `ملتقى القيادات 2026`

#### 8.1.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_conference_executive_reply_qr_ar_v1`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
مرحبًا {{1}}،

يسرّنا دعوتك إلى {{2}}؛ لقاء يجمع الخبرات والرؤى لصناعة حوار مثمر.
يُقام يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستنضم إلينا؟ عند تأكيد حضورك، ستصلك بطاقة الدخول الخاصة بك.
نتطلع إلى حضورك ومشاركتك.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 8.1.2 رد فقط — `reply_only`

- **Meta name:** `halaa_conference_executive_reply_only_ar_v1`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
مرحبًا {{1}}،

يسرّنا دعوتك إلى {{2}}؛ لقاء يجمع الخبرات والرؤى لصناعة حوار مثمر.
يُقام يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستنضم إلينا؟
نتطلع إلى حضورك ومشاركتك.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 8.1.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_conference_executive_qr_only_ar_v1`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
مرحبًا {{1}}،

يسرّنا دعوتك إلى {{2}}؛ لقاء يجمع الخبرات والرؤى لصناعة حوار مثمر.
يُقام يوم {{3}}، عند الساعة {{4}}، في {{5}}.

بطاقة دخولك متاحة عبر الزر المرفق لتسجيل أسرع عند الوصول.
نتطلع إلى حضورك ومشاركتك.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 8.1.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_conference_executive_none_ar_v1`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `none`

**Body**

```text
مرحبًا {{1}}،

يسرّنا دعوتك إلى {{2}}؛ لقاء يجمع الخبرات والرؤى لصناعة حوار مثمر.
يُقام يوم {{3}}، عند الساعة {{4}}، في {{5}}.

نتطلع إلى حضورك ومشاركتك.
```

**Buttons:** none

---

### 8.2 ملتقى الابتكار — `innovation`

**Best for:** حديثة لملتقيات التقنية والابتكار وريادة الأعمال.

**Meta sample event title:** `ملتقى الابتكار الرقمي`

#### 8.2.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_conference_innovation_reply_qr_ar_v1`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
مرحبًا {{1}}،

الأفكار الجديدة تبدأ بلقاء الأشخاص المناسبين. يسعدنا حضورك في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستكون جزءًا من هذا اللقاء؟ بعد تأكيد حضورك، ستصلك بطاقة الدخول الرقمية الخاصة بك.
ننتظر رؤيتك وما ستضيفه من أفكار.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 8.2.2 رد فقط — `reply_only`

- **Meta name:** `halaa_conference_innovation_reply_only_ar_v1`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
مرحبًا {{1}}،

الأفكار الجديدة تبدأ بلقاء الأشخاص المناسبين. يسعدنا حضورك في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستكون جزءًا من هذا اللقاء؟
ننتظر رؤيتك وما ستضيفه من أفكار.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 8.2.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_conference_innovation_qr_only_ar_v1`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
مرحبًا {{1}}،

الأفكار الجديدة تبدأ بلقاء الأشخاص المناسبين. يسعدنا حضورك في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

بطاقة دخولك الرقمية متاحة عبر الزر المرفق لاستخدامها عند الوصول.
ننتظر رؤيتك وما ستضيفه من أفكار.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 8.2.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_conference_innovation_none_ar_v1`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `none`

**Body**

```text
مرحبًا {{1}}،

الأفكار الجديدة تبدأ بلقاء الأشخاص المناسبين. يسعدنا حضورك في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

ننتظر رؤيتك وما ستضيفه من أفكار.
```

**Buttons:** none

---

### 8.3 ورشة العمل — `workshop`

**Best for:** عملية للورش والجلسات التدريبية.

**Meta sample event title:** `ورشة بناء العلامات التجارية`

#### 8.3.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_conference_workshop_reply_qr_ar_v1`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
مرحبًا {{1}}،

ندعوك إلى تجربة عملية مليئة بالتعلّم والتطبيق في {{2}}.
تُقام يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستنضم إلى الورشة؟ عند تأكيد حضورك، ستصلك بطاقة الدخول الخاصة بك.
استعد لتجربة ثرية، ونتطلع إلى مشاركتك.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 8.3.2 رد فقط — `reply_only`

- **Meta name:** `halaa_conference_workshop_reply_only_ar_v1`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
مرحبًا {{1}}،

ندعوك إلى تجربة عملية مليئة بالتعلّم والتطبيق في {{2}}.
تُقام يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستنضم إلى الورشة؟
استعد لتجربة ثرية، ونتطلع إلى مشاركتك.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 8.3.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_conference_workshop_qr_only_ar_v1`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
مرحبًا {{1}}،

ندعوك إلى تجربة عملية مليئة بالتعلّم والتطبيق في {{2}}.
تُقام يوم {{3}}، عند الساعة {{4}}، في {{5}}.

بطاقة دخولك متاحة عبر الزر المرفق لإتمام التسجيل عند الوصول.
استعد لتجربة ثرية، ونتطلع إلى مشاركتك.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 8.3.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_conference_workshop_none_ar_v1`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `none`

**Body**

```text
مرحبًا {{1}}،

ندعوك إلى تجربة عملية مليئة بالتعلّم والتطبيق في {{2}}.
تُقام يوم {{3}}، عند الساعة {{4}}، في {{5}}.

استعد لتجربة ثرية، ونتطلع إلى مشاركتك.
```

**Buttons:** none

---

### 8.4 الندوة المعرفية — `knowledge`

**Best for:** رصينة للندوات والمحاضرات والحوارات المتخصصة.

**Meta sample event title:** `ندوة مستقبل المدن`

#### 8.4.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_conference_knowledge_reply_qr_ar_v1`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
مرحبًا {{1}}،

يسرّنا دعوتك إلى {{2}}، حيث نفتح بابًا للنقاش وتبادل المعرفة حول موضوع يستحق الاهتمام.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستشاركنا هذا الحوار؟ بعد تأكيد حضورك، ستصلك بطاقة الدخول الخاصة بك.
حضورك يثري النقاش، ونتطلع إلى لقائك.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 8.4.2 رد فقط — `reply_only`

- **Meta name:** `halaa_conference_knowledge_reply_only_ar_v1`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
مرحبًا {{1}}،

يسرّنا دعوتك إلى {{2}}، حيث نفتح بابًا للنقاش وتبادل المعرفة حول موضوع يستحق الاهتمام.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستشاركنا هذا الحوار؟
حضورك يثري النقاش، ونتطلع إلى لقائك.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 8.4.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_conference_knowledge_qr_only_ar_v1`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
مرحبًا {{1}}،

يسرّنا دعوتك إلى {{2}}، حيث نفتح بابًا للنقاش وتبادل المعرفة حول موضوع يستحق الاهتمام.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

بطاقة دخولك متاحة عبر الزر المرفق لاستخدامها عند الوصول.
حضورك يثري النقاش، ونتطلع إلى لقائك.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 8.4.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_conference_knowledge_none_ar_v1`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `none`

**Body**

```text
مرحبًا {{1}}،

يسرّنا دعوتك إلى {{2}}، حيث نفتح بابًا للنقاش وتبادل المعرفة حول موضوع يستحق الاهتمام.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

حضورك يثري النقاش، ونتطلع إلى لقائك.
```

**Buttons:** none

---

### 8.5 لقاء التواصل — `networking`

**Best for:** اجتماعية مهنية للمنتديات ولقاءات بناء العلاقات.

**Meta sample event title:** `منتدى رواد الأعمال`

#### 8.5.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_conference_networking_reply_qr_ar_v1`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
مرحبًا {{1}}،

العلاقات المهمة تبدأ بلقاء جيد. يسعدنا دعوتك إلى {{2}} للتعرّف إلى خبرات وفرص جديدة.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستنضم إلى هذا اللقاء؟ عند تأكيد حضورك، ستصلك بطاقة الدخول الرقمية الخاصة بك.
نتطلع إلى حضورك ولقاءات مثمرة تجمعنا.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 8.5.2 رد فقط — `reply_only`

- **Meta name:** `halaa_conference_networking_reply_only_ar_v1`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
مرحبًا {{1}}،

العلاقات المهمة تبدأ بلقاء جيد. يسعدنا دعوتك إلى {{2}} للتعرّف إلى خبرات وفرص جديدة.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستنضم إلى هذا اللقاء؟
نتطلع إلى حضورك ولقاءات مثمرة تجمعنا.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

#### 8.5.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_conference_networking_qr_only_ar_v1`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
مرحبًا {{1}}،

العلاقات المهمة تبدأ بلقاء جيد. يسعدنا دعوتك إلى {{2}} للتعرّف إلى خبرات وفرص جديدة.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

بطاقة دخولك الرقمية متاحة عبر الزر المرفق لتقديمها عند الوصول.
نتطلع إلى حضورك ولقاءات مثمرة تجمعنا.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 8.5.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_conference_networking_none_ar_v1`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `none`

**Body**

```text
مرحبًا {{1}}،

العلاقات المهمة تبدأ بلقاء جيد. يسعدنا دعوتك إلى {{2}} للتعرّف إلى خبرات وفرص جديدة.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

نتطلع إلى حضورك ولقاءات مثمرة تجمعنا.
```

**Buttons:** none

---

## 9. Dashboard assignment

For each approved template:

1. Sync it from Taqnyat.
2. Assign the exact Halaa category stated beside the template.
3. Set `type` to `invite`.
4. Set the exact `invitationMode` stated beside the template.
5. Map `{{1}}` through `{{5}}` to the common source keys in section 1.
6. Confirm the synced controls match the selected mode.
7. Activate the template only after a real WhatsApp test succeeds.

## 10. Acceptance checklist

- All five body variables resolve to the correct guest and event.
- The invitation artwork loads as the image header.
- RSVP labels are exactly `سأحضر`, `سأعتذر`, and `ربما`.
- `reply_and_qr` sends a QR only after confirmation.
- `reply_only` never promises or sends a QR.
- `qr_only` opens the correct guest pass and contains no RSVP question.
- `none` contains no controls or response request.
- Arabic line breaks, punctuation, and emoji render correctly.
- The selected writing direction matches the actual occasion and audience.

## 11. Compliance notes

- Use only with recipients the host is permitted to contact.
- Do not add unrelated offers, discounts, or promotional urgency.
- Never include sensitive guest data in samples, headers, footers, or names.
- Do not shorten the QR URL.
- Use a new version suffix such as `_v2` when approved copy or controls change.
- Meta retains final approval and category-classification authority.

## 12. Official references

- [Taqnyat WhatsApp API documentation](https://dev.taqnyat.sa/en/doc/whatsapp/)
- [Taqnyat template message elements and limits](https://blog.taqnyat.sa/en/post/template-message-elements-and-size/)
- [Taqnyat template manager](https://blog.taqnyat.sa/en/post/template_manager/)
