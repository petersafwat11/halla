# Halaa WhatsApp Invitation Catalog — Scenario-led Human Writing System

**Version:** 4.0  
**Status:** pre-submission copy candidate  
**Language:** Arabic (`ar`)  
**Coverage:** 7 categories × 5 creative directions × 4 invitation modes = **140 templates**

> V4 keeps the four functional invitation modes but rebuilds the creative layer around real event scenarios, recipient roles, sender perspectives, gender scope, and event stage. V3 remains available for comparison and is not modified.

---

## 1. Writing and behavior contract

### 1.1 The five voices

| Voice | Writing rule |
|---|---|
| **الدافئة** `warm` | عربية طبيعية وقريبة؛ مشاعر صادقة بلا مبالغة أو ضغط على الضيف. |
| **الكلاسيكية** `classic` | رسمية هادئة؛ واضحة ومناسبة للعائلات والجهات، بلا تراكيب إدارية جامدة. |
| **العصرية** `modern` | خفيفة ومباشرة؛ أسطر قصيرة وثلاثة رموز مرئية كحد أقصى تخدم المعنى. |
| **الشخصية** `intimate` | مختصرة وقريبة؛ تتحدث إلى الضيف بصدق وتتجنب المبالغة والعبارات الضاغطة. |
| **الأصيلة** `heritage` | ضيافة سعودية وخليجية طبيعية؛ ترحيب عائلي واضح من دون تحويل الفصحى إلى سجع. |

Voice consistency means consistent character, not an identical sentence skeleton. Openings, detail order, and closings may vary when natural Arabic requires it.

### 1.2 Canonical invitation-mode language

| Invitation mode | Guest-facing instruction | Buttons |
|---|---|---|
| `reply_and_qr` | نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك. | ثلاثة ردود سريعة |
| `reply_only` | نرجو اختيار حالة الحضور. | ثلاثة ردود سريعة |
| `qr_only` | رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول. | عرض رمز الدخول |
| `none` | لا توجد تعليمات تشغيلية. | لا توجد |

Operational instructions remain identical across voices so that QR and RSVP behavior never changes with tone.

### 1.3 Quick-reply contract

| Visible Arabic label | Stable webhook payload | Stored meaning |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

The backend must map stable payloads, not visible Arabic labels. Copy changes must not break RSVP processing.

---

## 2. Submission contract

| Field | Value |
|---|---|
| Expected Meta category | `MARKETING` for invitation initiation; enable `allow_category_change` and record Meta's returned category |
| Language | `ar` |
| Header | `IMAGE` |
| Neutral footer | `أُرسلت هذه الدعوة عبر هلا` |
| Halaa type | `invite` |
| Consent gate | Send only to recipients with recorded WhatsApp opt-in; preserve an opt-out path |

### 2.1 Body variables

| Placeholder | Halaa source | Example |
|---|---|---|
| `{{1}}` | `guest.name` | `عبدالله الشهري` |
| `{{2}}` | `eventDetails.title` | Scenario-specific event title |
| `{{3}}` | `eventDetails.dateFormatted` | `الجمعة 15 أغسطس 2026` |
| `{{4}}` | `eventDetails.timeFormatted` | `8:30 مساءً بتوقيت الرياض` |
| `{{5}}` | `eventDetails.locationDisplay` | `قاعة ليلتي، جدة` |

Every body variable is component-scoped. The URL button variable below is separate from body `{{1}}` and must be sent in the URL-button component.

### 2.2 QR-only dynamic button

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Button parameter example: invitation capability token, not guest.name
```

Confirm the production domain and capability-token behavior before submission.

### 2.3 Assignment metadata required in the dashboard

Do not assign by category and invitation mode alone. Store and expose:

- creative voice;
- event scenario;
- recipient role;
- sender perspective;
- guest and child gender scope;
- before/after-birth stage where applicable;
- physical, online, or hybrid venue mode;
- time-of-day assumptions.

---

## 3. Creative and scenario matrices

### 3.1 Creative matrix

| Category | Warm | Classic | Modern | Intimate | Heritage |
|---|---|---|---|---|---|
| الزفاف `wedding` | فرحتنا بين الأحبة | دعوة العائلتين | موعد فرحتنا | لقاء قريب | حضورك محل ترحيب |
| الخطوبة `engagement` | نشارككم فرحتنا | إعلان العائلتين | صار الخبر رسميًا | الخبر منّا إليك | فرحة العائلتين |
| عيد الميلاد `birthday` | يوم مليء بالفرح | عام جديد من العمر | مفاجأة عيد الميلاد | عام له مكانة خاصة | احتفال بين الأهل |
| استقبال المولود `baby_shower` | في انتظار فرد جديد | فرحتنا بمولودنا | وصلت صغيرتنا | دعوة العقيقة | الحمد لله على تمام النعمة |
| المناسبة النسائية `ladies_event` | لقاء يجمعنا بمن نحب | دعوة نسائية رسمية | صحبة جميلة | ليلة قريبة من العروس | أمسية بين الأهل |
| المناسبة العامة `general_event` | فرحة الإنجاز | دعوة إلى منزلنا الجديد | موعد الافتتاح | مسيرة تستحق التقدير | لمّة العيد |
| المؤتمر `conference` | دعوة الحضور | دعوة المتحدثين | لقاء القيادات | جلسة عملية | ملتقى أهل الخبرة |

### 3.2 Scenario matrix

| Category | Five host-facing choices |
|---|---|
| الزفاف | فرحتنا بين الأحبة — زفاف عائلي مع الأصدقاء والمقرّبين · دعوة العائلتين — حفل رسمي صادر باسم العائلتين · موعد فرحتنا — زفاف عصري للأصدقاء والأقارب · لقاء قريب — زفاف صغير أو عشاء محدود للمقرّبين · حضورك محل ترحيب — زفاف عائلي بروح الضيافة السعودية |
| الخطوبة | نشارككم فرحتنا — إعلان الخطوبة من الزوجين · إعلان العائلتين — خطوبة رسمية باسم العائلتين · صار الخبر رسميًا — احتفال عصري بالخطوبة · الخبر منّا إليك — إعلان شخصي للدائرة القريبة · فرحة العائلتين — خطوبة عائلية تقليدية |
| عيد الميلاد | يوم مليء بالفرح — عيد ميلاد طفل · عام جديد من العمر — عيد ميلاد بالغ بطابع هادئ · مفاجأة عيد الميلاد — حفلة عيد ميلاد مفاجئة · عام له مكانة خاصة — عيد ميلاد لمحطة عمرية مميزة · احتفال بين الأهل — عيد ميلاد أحد الوالدين أو كبار العائلة |
| استقبال المولود | في انتظار فرد جديد — احتفال قبل الولادة · فرحتنا بمولودنا — استقبال مولود ذكر بعد الولادة · وصلت صغيرتنا — استقبال مولودة بعد الولادة · دعوة العقيقة — عقيقة بصياغة لا تفترض جنس الطفل · الحمد لله على تمام النعمة — استقبال عائلي محايد بعد الولادة |
| المناسبة النسائية | لقاء يجمعنا بمن نحب — لقاء نسائي اجتماعي · دعوة نسائية رسمية — استقبال رسمي أو لقاء مهني نسائي · صحبة جميلة — لقاء خفيف للصديقات · ليلة قريبة من العروس — ليلة حناء أو مناسبة خاصة بالعروس · أمسية بين الأهل — لقاء نسائي عائلي بطابع خليجي |
| المناسبة العامة | فرحة الإنجاز — تخرج أو إنجاز شخصي · دعوة إلى منزلنا الجديد — احتفال بمنزل جديد · موعد الافتتاح — افتتاح مشروع أو إطلاق جديد · مسيرة تستحق التقدير — تكريم أو تقاعد أو وداع مهني · لمّة العيد — عيد أو لقاء عائلي ومجتمعي |
| المؤتمر | دعوة الحضور — دعوة عامة لحضور مؤتمر أو ملتقى · دعوة المتحدثين — دعوة متحدث أو عضو جلسة · لقاء القيادات — دعوة تنفيذية أو لكبار الضيوف · جلسة عملية — ورشة أو جلسة محدودة العدد · ملتقى أهل الخبرة — ملتقى للتعارف وتبادل الخبرات |

---

## 4. Wedding — الزفاف `wedding`

خمسة اتجاهات تراعي اختلاف الجهة المرسلة وحجم المناسبة وطابعها.

### 4.1 فرحتنا بين الأحبة — الدافئة `warm`

- **Scenario:** زفاف عائلي مع الأصدقاء والمقرّبين
- **Audience:** الأهل والأصدقاء
- **Sender perspective:** العروسان أو الأسرة
- **Gender scope:** محايد للضيف
- **Meta sample title:** `حفل زفاف أحمد ونورة`

#### 4.1.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_wedding_close_circle_reply_qr_ar_v3`
- **Halaa category:** `wedding`
- **Voice:** `warm`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا {{1}}،

نجتمع بمن نحب في «{{2}}»، ويسعدنا أن نشاركك فرحة هذا اليوم.
موعدنا يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
نفرح بحضورك ولقائك في هذه المناسبة 🤍
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 4.1.2 رد فقط — `reply_only`

- **Meta name:** `halaa_wedding_close_circle_reply_only_ar_v3`
- **Halaa category:** `wedding`
- **Voice:** `warm`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا {{1}}،

نجتمع بمن نحب في «{{2}}»، ويسعدنا أن نشاركك فرحة هذا اليوم.
موعدنا يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور.
نفرح بحضورك ولقائك في هذه المناسبة 🤍
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 4.1.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_wedding_close_circle_qr_only_ar_v3`
- **Halaa category:** `wedding`
- **Voice:** `warm`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا {{1}}،

نجتمع بمن نحب في «{{2}}»، ويسعدنا أن نشاركك فرحة هذا اليوم.
موعدنا يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
نفرح بحضورك ولقائك في هذه المناسبة 🤍
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 4.1.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_wedding_close_circle_none_ar_v3`
- **Halaa category:** `wedding`
- **Voice:** `warm`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا {{1}}،

نجتمع بمن نحب في «{{2}}»، ويسعدنا أن نشاركك فرحة هذا اليوم.
موعدنا يوم {{3}}، الساعة {{4}}، في {{5}}.

نفرح بحضورك ولقائك في هذه المناسبة 🤍
```

**Buttons:** none

---

### 4.2 دعوة العائلتين — الكلاسيكية `classic`

- **Scenario:** حفل رسمي صادر باسم العائلتين
- **Audience:** العائلة والضيوف الرسميون
- **Sender perspective:** العائلتان
- **Gender scope:** محايد للضيف
- **Meta sample title:** `حفل زفاف خالد وسارة`

#### 4.2.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_wedding_two_families_reply_qr_ar_v3`
- **Halaa category:** `wedding`
- **Voice:** `classic`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
{{1}}،

تتشرّف العائلتان بدعوتك إلى «{{2}}»، ومشاركتهما فرحة هذا اليوم.
التاريخ: {{3}}
الوقت: {{4}}
المكان: {{5}}

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
تسعدنا مشاركتك هذه المناسبة.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 4.2.2 رد فقط — `reply_only`

- **Meta name:** `halaa_wedding_two_families_reply_only_ar_v3`
- **Halaa category:** `wedding`
- **Voice:** `classic`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
{{1}}،

تتشرّف العائلتان بدعوتك إلى «{{2}}»، ومشاركتهما فرحة هذا اليوم.
التاريخ: {{3}}
الوقت: {{4}}
المكان: {{5}}

نرجو اختيار حالة الحضور.
تسعدنا مشاركتك هذه المناسبة.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 4.2.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_wedding_two_families_qr_only_ar_v3`
- **Halaa category:** `wedding`
- **Voice:** `classic`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
{{1}}،

تتشرّف العائلتان بدعوتك إلى «{{2}}»، ومشاركتهما فرحة هذا اليوم.
التاريخ: {{3}}
الوقت: {{4}}
المكان: {{5}}

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
تسعدنا مشاركتك هذه المناسبة.
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 4.2.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_wedding_two_families_none_ar_v3`
- **Halaa category:** `wedding`
- **Voice:** `classic`
- **Halaa invitation mode:** `none`

**Body**

```text
{{1}}،

تتشرّف العائلتان بدعوتك إلى «{{2}}»، ومشاركتهما فرحة هذا اليوم.
التاريخ: {{3}}
الوقت: {{4}}
المكان: {{5}}

تسعدنا مشاركتك هذه المناسبة.
```

**Buttons:** none

---

### 4.3 موعد فرحتنا — العصرية `modern`

- **Scenario:** زفاف عصري للأصدقاء والأقارب
- **Audience:** الأصدقاء والأقارب
- **Sender perspective:** العروسان
- **Gender scope:** محايد للضيف
- **Meta sample title:** `ليلة زفاف فيصل ولين`

#### 4.3.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_wedding_modern_friends_reply_qr_ar_v3`
- **Halaa category:** `wedding`
- **Voice:** `modern`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
يا هلا {{1}} 🤍

موعدنا في «{{2}}»، والفرحة أجمل باجتماع الأحبة.

📅 {{3}} · {{4}}
📍 {{5}}

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
نلتقي على خير.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 4.3.2 رد فقط — `reply_only`

- **Meta name:** `halaa_wedding_modern_friends_reply_only_ar_v3`
- **Halaa category:** `wedding`
- **Voice:** `modern`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
يا هلا {{1}} 🤍

موعدنا في «{{2}}»، والفرحة أجمل باجتماع الأحبة.

📅 {{3}} · {{4}}
📍 {{5}}

نرجو اختيار حالة الحضور.
نلتقي على خير.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 4.3.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_wedding_modern_friends_qr_only_ar_v3`
- **Halaa category:** `wedding`
- **Voice:** `modern`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
يا هلا {{1}} 🤍

موعدنا في «{{2}}»، والفرحة أجمل باجتماع الأحبة.

📅 {{3}} · {{4}}
📍 {{5}}

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
نلتقي على خير.
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 4.3.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_wedding_modern_friends_none_ar_v3`
- **Halaa category:** `wedding`
- **Voice:** `modern`
- **Halaa invitation mode:** `none`

**Body**

```text
يا هلا {{1}} 🤍

موعدنا في «{{2}}»، والفرحة أجمل باجتماع الأحبة.

📅 {{3}} · {{4}}
📍 {{5}}

نلتقي على خير.
```

**Buttons:** none

---

### 4.4 لقاء قريب — الشخصية `intimate`

- **Scenario:** زفاف صغير أو عشاء محدود للمقرّبين
- **Audience:** الدائرة القريبة
- **Sender perspective:** العروسان
- **Gender scope:** محايد للضيف
- **Meta sample title:** `حفل زفاف عمر ومها`

#### 4.4.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_wedding_small_gathering_reply_qr_ar_v3`
- **Halaa category:** `wedding`
- **Voice:** `intimate`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
يا {{1}}،

اخترنا لـ«{{2}}» لقاءً بسيطًا مع المقرّبين، وتسعدنا مشاركتك هذا اليوم.

نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
وجودك يضيف إلى فرحتنا.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 4.4.2 رد فقط — `reply_only`

- **Meta name:** `halaa_wedding_small_gathering_reply_only_ar_v3`
- **Halaa category:** `wedding`
- **Voice:** `intimate`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
يا {{1}}،

اخترنا لـ«{{2}}» لقاءً بسيطًا مع المقرّبين، وتسعدنا مشاركتك هذا اليوم.

نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور.
وجودك يضيف إلى فرحتنا.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 4.4.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_wedding_small_gathering_qr_only_ar_v3`
- **Halaa category:** `wedding`
- **Voice:** `intimate`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
يا {{1}}،

اخترنا لـ«{{2}}» لقاءً بسيطًا مع المقرّبين، وتسعدنا مشاركتك هذا اليوم.

نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
وجودك يضيف إلى فرحتنا.
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 4.4.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_wedding_small_gathering_none_ar_v3`
- **Halaa category:** `wedding`
- **Voice:** `intimate`
- **Halaa invitation mode:** `none`

**Body**

```text
يا {{1}}،

اخترنا لـ«{{2}}» لقاءً بسيطًا مع المقرّبين، وتسعدنا مشاركتك هذا اليوم.

نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

وجودك يضيف إلى فرحتنا.
```

**Buttons:** none

---

### 4.5 حضورك محل ترحيب — الأصيلة `heritage`

- **Scenario:** زفاف عائلي بروح الضيافة السعودية
- **Audience:** العائلة والمعارف
- **Sender perspective:** الأسرة
- **Gender scope:** محايد للضيف
- **Meta sample title:** `ليلة زفاف عبدالله والجوهرة`

#### 4.5.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_wedding_family_hospitality_reply_qr_ar_v3`
- **Halaa category:** `wedding`
- **Voice:** `heritage`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
حيّاك الله {{1}}،

يسرّ العائلة دعوتك إلى «{{2}}»، ويسعدها حضورك بين أهلك ومحبيك.
نلقاك يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
لك منّا كل الترحيب، ونسعد بلقائك.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 4.5.2 رد فقط — `reply_only`

- **Meta name:** `halaa_wedding_family_hospitality_reply_only_ar_v3`
- **Halaa category:** `wedding`
- **Voice:** `heritage`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
حيّاك الله {{1}}،

يسرّ العائلة دعوتك إلى «{{2}}»، ويسعدها حضورك بين أهلك ومحبيك.
نلقاك يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور.
لك منّا كل الترحيب، ونسعد بلقائك.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 4.5.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_wedding_family_hospitality_qr_only_ar_v3`
- **Halaa category:** `wedding`
- **Voice:** `heritage`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
حيّاك الله {{1}}،

يسرّ العائلة دعوتك إلى «{{2}}»، ويسعدها حضورك بين أهلك ومحبيك.
نلقاك يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
لك منّا كل الترحيب، ونسعد بلقائك.
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 4.5.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_wedding_family_hospitality_none_ar_v3`
- **Halaa category:** `wedding`
- **Voice:** `heritage`
- **Halaa invitation mode:** `none`

**Body**

```text
حيّاك الله {{1}}،

يسرّ العائلة دعوتك إلى «{{2}}»، ويسعدها حضورك بين أهلك ومحبيك.
نلقاك يوم {{3}}، الساعة {{4}}، في {{5}}.

لك منّا كل الترحيب، ونسعد بلقائك.
```

**Buttons:** none

---


## 5. Engagement — الخطوبة `engagement`

اتجاهات للزوجين والعائلتين والدائرة القريبة والاحتفال التقليدي.

### 5.1 نشارككم فرحتنا — الدافئة `warm`

- **Scenario:** إعلان الخطوبة من الزوجين
- **Audience:** الأهل والأصدقاء
- **Sender perspective:** الزوجان
- **Gender scope:** محايد للضيف
- **Meta sample title:** `حفل خطوبة خالد وسارة`

#### 5.1.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_engagement_couple_announcement_reply_qr_ar_v3`
- **Halaa category:** `engagement`
- **Voice:** `warm`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا {{1}}،

اكتملت فرحتنا بهذه الخطوة، ويسعدنا أن نشاركها معك في «{{2}}».
نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
نفرح بحضورك ومشاركتنا المناسبة 🤍
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 5.1.2 رد فقط — `reply_only`

- **Meta name:** `halaa_engagement_couple_announcement_reply_only_ar_v3`
- **Halaa category:** `engagement`
- **Voice:** `warm`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا {{1}}،

اكتملت فرحتنا بهذه الخطوة، ويسعدنا أن نشاركها معك في «{{2}}».
نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور.
نفرح بحضورك ومشاركتنا المناسبة 🤍
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 5.1.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_engagement_couple_announcement_qr_only_ar_v3`
- **Halaa category:** `engagement`
- **Voice:** `warm`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا {{1}}،

اكتملت فرحتنا بهذه الخطوة، ويسعدنا أن نشاركها معك في «{{2}}».
نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
نفرح بحضورك ومشاركتنا المناسبة 🤍
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 5.1.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_engagement_couple_announcement_none_ar_v3`
- **Halaa category:** `engagement`
- **Voice:** `warm`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا {{1}}،

اكتملت فرحتنا بهذه الخطوة، ويسعدنا أن نشاركها معك في «{{2}}».
نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

نفرح بحضورك ومشاركتنا المناسبة 🤍
```

**Buttons:** none

---

### 5.2 إعلان العائلتين — الكلاسيكية `classic`

- **Scenario:** خطوبة رسمية باسم العائلتين
- **Audience:** العائلة والضيوف الرسميون
- **Sender perspective:** العائلتان
- **Gender scope:** محايد للضيف
- **Meta sample title:** `حفل خطوبة راشد وريم`

#### 5.2.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_engagement_formal_families_reply_qr_ar_v3`
- **Halaa category:** `engagement`
- **Voice:** `classic`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
{{1}}،

بمناسبة الخطوبة، تتشرّف العائلتان بدعوتك إلى «{{2}}».
التاريخ: {{3}}
الوقت: {{4}}
المكان: {{5}}

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
تسعدنا مشاركتك هذه المناسبة.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 5.2.2 رد فقط — `reply_only`

- **Meta name:** `halaa_engagement_formal_families_reply_only_ar_v3`
- **Halaa category:** `engagement`
- **Voice:** `classic`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
{{1}}،

بمناسبة الخطوبة، تتشرّف العائلتان بدعوتك إلى «{{2}}».
التاريخ: {{3}}
الوقت: {{4}}
المكان: {{5}}

نرجو اختيار حالة الحضور.
تسعدنا مشاركتك هذه المناسبة.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 5.2.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_engagement_formal_families_qr_only_ar_v3`
- **Halaa category:** `engagement`
- **Voice:** `classic`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
{{1}}،

بمناسبة الخطوبة، تتشرّف العائلتان بدعوتك إلى «{{2}}».
التاريخ: {{3}}
الوقت: {{4}}
المكان: {{5}}

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
تسعدنا مشاركتك هذه المناسبة.
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 5.2.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_engagement_formal_families_none_ar_v3`
- **Halaa category:** `engagement`
- **Voice:** `classic`
- **Halaa invitation mode:** `none`

**Body**

```text
{{1}}،

بمناسبة الخطوبة، تتشرّف العائلتان بدعوتك إلى «{{2}}».
التاريخ: {{3}}
الوقت: {{4}}
المكان: {{5}}

تسعدنا مشاركتك هذه المناسبة.
```

**Buttons:** none

---

### 5.3 صار الخبر رسميًا — العصرية `modern`

- **Scenario:** احتفال عصري بالخطوبة
- **Audience:** الأصدقاء والأقارب
- **Sender perspective:** الزوجان
- **Gender scope:** محايد للضيف
- **Meta sample title:** `ليلة خطوبة نواف ودانة`

#### 5.3.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_engagement_casual_celebration_reply_qr_ar_v3`
- **Halaa category:** `engagement`
- **Voice:** `modern`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
يا هلا {{1}} ✨

صار الخبر رسميًا، وموعد احتفالنا في «{{2}}».

📅 {{3}} · {{4}}
📍 {{5}}

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
نفرح بلقائك هناك.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 5.3.2 رد فقط — `reply_only`

- **Meta name:** `halaa_engagement_casual_celebration_reply_only_ar_v3`
- **Halaa category:** `engagement`
- **Voice:** `modern`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
يا هلا {{1}} ✨

صار الخبر رسميًا، وموعد احتفالنا في «{{2}}».

📅 {{3}} · {{4}}
📍 {{5}}

نرجو اختيار حالة الحضور.
نفرح بلقائك هناك.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 5.3.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_engagement_casual_celebration_qr_only_ar_v3`
- **Halaa category:** `engagement`
- **Voice:** `modern`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
يا هلا {{1}} ✨

صار الخبر رسميًا، وموعد احتفالنا في «{{2}}».

📅 {{3}} · {{4}}
📍 {{5}}

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
نفرح بلقائك هناك.
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 5.3.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_engagement_casual_celebration_none_ar_v3`
- **Halaa category:** `engagement`
- **Voice:** `modern`
- **Halaa invitation mode:** `none`

**Body**

```text
يا هلا {{1}} ✨

صار الخبر رسميًا، وموعد احتفالنا في «{{2}}».

📅 {{3}} · {{4}}
📍 {{5}}

نفرح بلقائك هناك.
```

**Buttons:** none

---

### 5.4 الخبر منّا إليك — الشخصية `intimate`

- **Scenario:** إعلان شخصي للدائرة القريبة
- **Audience:** المقرّبون
- **Sender perspective:** الزوجان
- **Gender scope:** محايد للضيف
- **Meta sample title:** `خطوبة سامي ولطيفة`

#### 5.4.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_engagement_close_circle_reply_qr_ar_v3`
- **Halaa category:** `engagement`
- **Voice:** `intimate`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أحببنا أن يصلك الخبر منّا يا {{1}}، ويسعدنا أن ندعوك إلى «{{2}}».

الموعد يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
تسعدنا مشاركتك هذه البداية.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 5.4.2 رد فقط — `reply_only`

- **Meta name:** `halaa_engagement_close_circle_reply_only_ar_v3`
- **Halaa category:** `engagement`
- **Voice:** `intimate`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أحببنا أن يصلك الخبر منّا يا {{1}}، ويسعدنا أن ندعوك إلى «{{2}}».

الموعد يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور.
تسعدنا مشاركتك هذه البداية.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 5.4.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_engagement_close_circle_qr_only_ar_v3`
- **Halaa category:** `engagement`
- **Voice:** `intimate`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أحببنا أن يصلك الخبر منّا يا {{1}}، ويسعدنا أن ندعوك إلى «{{2}}».

الموعد يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
تسعدنا مشاركتك هذه البداية.
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 5.4.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_engagement_close_circle_none_ar_v3`
- **Halaa category:** `engagement`
- **Voice:** `intimate`
- **Halaa invitation mode:** `none`

**Body**

```text
أحببنا أن يصلك الخبر منّا يا {{1}}، ويسعدنا أن ندعوك إلى «{{2}}».

الموعد يوم {{3}}، الساعة {{4}}، في {{5}}.

تسعدنا مشاركتك هذه البداية.
```

**Buttons:** none

---

### 5.5 فرحة العائلتين — الأصيلة `heritage`

- **Scenario:** خطوبة عائلية تقليدية
- **Audience:** العائلتان والمعارف
- **Sender perspective:** العائلتان
- **Gender scope:** محايد للضيف
- **Meta sample title:** `حفل خطوبة أبناء العائلتين`

#### 5.5.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_engagement_traditional_family_reply_qr_ar_v3`
- **Halaa category:** `engagement`
- **Voice:** `heritage`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
حيّاك الله {{1}}،

بفضل الله تمّت الخطوبة، وتدعوك العائلتان بكل سرور إلى «{{2}}».
موعدنا يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
نسعد بحضورك ومشاركتنا الفرحة.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 5.5.2 رد فقط — `reply_only`

- **Meta name:** `halaa_engagement_traditional_family_reply_only_ar_v3`
- **Halaa category:** `engagement`
- **Voice:** `heritage`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
حيّاك الله {{1}}،

بفضل الله تمّت الخطوبة، وتدعوك العائلتان بكل سرور إلى «{{2}}».
موعدنا يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور.
نسعد بحضورك ومشاركتنا الفرحة.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 5.5.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_engagement_traditional_family_qr_only_ar_v3`
- **Halaa category:** `engagement`
- **Voice:** `heritage`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
حيّاك الله {{1}}،

بفضل الله تمّت الخطوبة، وتدعوك العائلتان بكل سرور إلى «{{2}}».
موعدنا يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
نسعد بحضورك ومشاركتنا الفرحة.
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 5.5.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_engagement_traditional_family_none_ar_v3`
- **Halaa category:** `engagement`
- **Voice:** `heritage`
- **Halaa invitation mode:** `none`

**Body**

```text
حيّاك الله {{1}}،

بفضل الله تمّت الخطوبة، وتدعوك العائلتان بكل سرور إلى «{{2}}».
موعدنا يوم {{3}}، الساعة {{4}}، في {{5}}.

نسعد بحضورك ومشاركتنا الفرحة.
```

**Buttons:** none

---


## 6. Birthday — عيد الميلاد `birthday`

خيارات منفصلة للأطفال والبالغين والمفاجآت والمحطات العمرية ولمّة الأسرة.

### 6.1 يوم مليء بالفرح — الدافئة `warm`

- **Scenario:** عيد ميلاد طفل
- **Audience:** العائلة والأصدقاء وأولياء الأمور
- **Sender perspective:** الأسرة
- **Gender scope:** محايد للضيف ولصاحب المناسبة
- **Meta sample title:** `عيد ميلاد يوسف الخامس`

#### 6.1.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_birthday_child_party_reply_qr_ar_v3`
- **Halaa category:** `birthday`
- **Voice:** `warm`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا {{1}}،

نحتفل في «{{2}}» بيوم مليء بالمرح واللحظات الجميلة، ويسعدنا حضورك معنا.
الحفل يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
نلقاك بكل فرح 🎈
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 6.1.2 رد فقط — `reply_only`

- **Meta name:** `halaa_birthday_child_party_reply_only_ar_v3`
- **Halaa category:** `birthday`
- **Voice:** `warm`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا {{1}}،

نحتفل في «{{2}}» بيوم مليء بالمرح واللحظات الجميلة، ويسعدنا حضورك معنا.
الحفل يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور.
نلقاك بكل فرح 🎈
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 6.1.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_birthday_child_party_qr_only_ar_v3`
- **Halaa category:** `birthday`
- **Voice:** `warm`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا {{1}}،

نحتفل في «{{2}}» بيوم مليء بالمرح واللحظات الجميلة، ويسعدنا حضورك معنا.
الحفل يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
نلقاك بكل فرح 🎈
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 6.1.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_birthday_child_party_none_ar_v3`
- **Halaa category:** `birthday`
- **Voice:** `warm`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا {{1}}،

نحتفل في «{{2}}» بيوم مليء بالمرح واللحظات الجميلة، ويسعدنا حضورك معنا.
الحفل يوم {{3}}، الساعة {{4}}، في {{5}}.

نلقاك بكل فرح 🎈
```

**Buttons:** none

---

### 6.2 عام جديد من العمر — الكلاسيكية `classic`

- **Scenario:** عيد ميلاد بالغ بطابع هادئ
- **Audience:** العائلة والأصدقاء
- **Sender perspective:** صاحب المناسبة أو الأسرة
- **Gender scope:** محايد للضيف ولصاحب المناسبة
- **Meta sample title:** `عيد ميلاد ليان`

#### 6.2.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_birthday_adult_birthday_reply_qr_ar_v3`
- **Halaa category:** `birthday`
- **Voice:** `classic`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
{{1}}،

يسرّنا دعوتك إلى «{{2}}»، احتفاءً بعام جديد من العمر بصحبة العائلة والأصدقاء.
التاريخ: {{3}}
الوقت: {{4}}
المكان: {{5}}

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
يسعدنا لقاؤك في هذه المناسبة.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 6.2.2 رد فقط — `reply_only`

- **Meta name:** `halaa_birthday_adult_birthday_reply_only_ar_v3`
- **Halaa category:** `birthday`
- **Voice:** `classic`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
{{1}}،

يسرّنا دعوتك إلى «{{2}}»، احتفاءً بعام جديد من العمر بصحبة العائلة والأصدقاء.
التاريخ: {{3}}
الوقت: {{4}}
المكان: {{5}}

نرجو اختيار حالة الحضور.
يسعدنا لقاؤك في هذه المناسبة.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 6.2.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_birthday_adult_birthday_qr_only_ar_v3`
- **Halaa category:** `birthday`
- **Voice:** `classic`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
{{1}}،

يسرّنا دعوتك إلى «{{2}}»، احتفاءً بعام جديد من العمر بصحبة العائلة والأصدقاء.
التاريخ: {{3}}
الوقت: {{4}}
المكان: {{5}}

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
يسعدنا لقاؤك في هذه المناسبة.
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 6.2.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_birthday_adult_birthday_none_ar_v3`
- **Halaa category:** `birthday`
- **Voice:** `classic`
- **Halaa invitation mode:** `none`

**Body**

```text
{{1}}،

يسرّنا دعوتك إلى «{{2}}»، احتفاءً بعام جديد من العمر بصحبة العائلة والأصدقاء.
التاريخ: {{3}}
الوقت: {{4}}
المكان: {{5}}

يسعدنا لقاؤك في هذه المناسبة.
```

**Buttons:** none

---

### 6.3 مفاجأة عيد الميلاد — العصرية `modern`

- **Scenario:** حفلة عيد ميلاد مفاجئة
- **Audience:** الأصدقاء والأقارب المطلعون على المفاجأة
- **Sender perspective:** منظّم المفاجأة
- **Gender scope:** محايد للضيف ولصاحب المناسبة
- **Meta sample title:** `مفاجأة عيد ميلاد نورة`

#### 6.3.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_birthday_surprise_party_reply_qr_ar_v3`
- **Halaa category:** `birthday`
- **Voice:** `modern`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
يا هلا {{1}} 🎉

نحضّر مفاجأة جميلة في «{{2}}»، ونحب أن تبقى التفاصيل بيننا حتى الموعد.

📅 {{3}} · {{4}}
📍 {{5}}

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
نلتقي هناك قبل بدء المفاجأة.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 6.3.2 رد فقط — `reply_only`

- **Meta name:** `halaa_birthday_surprise_party_reply_only_ar_v3`
- **Halaa category:** `birthday`
- **Voice:** `modern`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
يا هلا {{1}} 🎉

نحضّر مفاجأة جميلة في «{{2}}»، ونحب أن تبقى التفاصيل بيننا حتى الموعد.

📅 {{3}} · {{4}}
📍 {{5}}

نرجو اختيار حالة الحضور.
نلتقي هناك قبل بدء المفاجأة.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 6.3.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_birthday_surprise_party_qr_only_ar_v3`
- **Halaa category:** `birthday`
- **Voice:** `modern`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
يا هلا {{1}} 🎉

نحضّر مفاجأة جميلة في «{{2}}»، ونحب أن تبقى التفاصيل بيننا حتى الموعد.

📅 {{3}} · {{4}}
📍 {{5}}

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
نلتقي هناك قبل بدء المفاجأة.
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 6.3.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_birthday_surprise_party_none_ar_v3`
- **Halaa category:** `birthday`
- **Voice:** `modern`
- **Halaa invitation mode:** `none`

**Body**

```text
يا هلا {{1}} 🎉

نحضّر مفاجأة جميلة في «{{2}}»، ونحب أن تبقى التفاصيل بيننا حتى الموعد.

📅 {{3}} · {{4}}
📍 {{5}}

نلتقي هناك قبل بدء المفاجأة.
```

**Buttons:** none

---

### 6.4 عام له مكانة خاصة — الشخصية `intimate`

- **Scenario:** عيد ميلاد لمحطة عمرية مميزة
- **Audience:** الدائرة القريبة
- **Sender perspective:** صاحب المناسبة أو الأسرة
- **Gender scope:** محايد للضيف ولصاحب المناسبة
- **Meta sample title:** `احتفال عامي الأربعين`

#### 6.4.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_birthday_milestone_reply_qr_ar_v3`
- **Halaa category:** `birthday`
- **Voice:** `intimate`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
يا {{1}}،

لهذا العام مكانة خاصة، واخترنا أن نحتفل به مع المقرّبين في «{{2}}».

نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
تسعدنا مشاركتك هذه المحطة.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 6.4.2 رد فقط — `reply_only`

- **Meta name:** `halaa_birthday_milestone_reply_only_ar_v3`
- **Halaa category:** `birthday`
- **Voice:** `intimate`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
يا {{1}}،

لهذا العام مكانة خاصة، واخترنا أن نحتفل به مع المقرّبين في «{{2}}».

نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور.
تسعدنا مشاركتك هذه المحطة.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 6.4.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_birthday_milestone_qr_only_ar_v3`
- **Halaa category:** `birthday`
- **Voice:** `intimate`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
يا {{1}}،

لهذا العام مكانة خاصة، واخترنا أن نحتفل به مع المقرّبين في «{{2}}».

نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
تسعدنا مشاركتك هذه المحطة.
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 6.4.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_birthday_milestone_none_ar_v3`
- **Halaa category:** `birthday`
- **Voice:** `intimate`
- **Halaa invitation mode:** `none`

**Body**

```text
يا {{1}}،

لهذا العام مكانة خاصة، واخترنا أن نحتفل به مع المقرّبين في «{{2}}».

نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

تسعدنا مشاركتك هذه المحطة.
```

**Buttons:** none

---

### 6.5 احتفال بين الأهل — الأصيلة `heritage`

- **Scenario:** عيد ميلاد أحد الوالدين أو كبار العائلة
- **Audience:** العائلة والمقرّبون
- **Sender perspective:** الأسرة
- **Gender scope:** محايد للضيف ولصاحب المناسبة
- **Meta sample title:** `احتفال العائلة بعيد ميلاد الوالدة`

#### 6.5.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_birthday_family_elder_reply_qr_ar_v3`
- **Halaa category:** `birthday`
- **Voice:** `heritage`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
حيّاك الله {{1}}،

تجتمع العائلة في «{{2}}» احتفاءً بعام جديد من العمر، ويسرّنا حضورك بين الأهل.
نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
نسعد بلقائك واجتماعنا على خير.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 6.5.2 رد فقط — `reply_only`

- **Meta name:** `halaa_birthday_family_elder_reply_only_ar_v3`
- **Halaa category:** `birthday`
- **Voice:** `heritage`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
حيّاك الله {{1}}،

تجتمع العائلة في «{{2}}» احتفاءً بعام جديد من العمر، ويسرّنا حضورك بين الأهل.
نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور.
نسعد بلقائك واجتماعنا على خير.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 6.5.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_birthday_family_elder_qr_only_ar_v3`
- **Halaa category:** `birthday`
- **Voice:** `heritage`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
حيّاك الله {{1}}،

تجتمع العائلة في «{{2}}» احتفاءً بعام جديد من العمر، ويسرّنا حضورك بين الأهل.
نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
نسعد بلقائك واجتماعنا على خير.
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 6.5.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_birthday_family_elder_none_ar_v3`
- **Halaa category:** `birthday`
- **Voice:** `heritage`
- **Halaa invitation mode:** `none`

**Body**

```text
حيّاك الله {{1}}،

تجتمع العائلة في «{{2}}» احتفاءً بعام جديد من العمر، ويسرّنا حضورك بين الأهل.
نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

نسعد بلقائك واجتماعنا على خير.
```

**Buttons:** none

---


## 7. Baby celebration — استقبال المولود `baby_shower`

تفصل بين ما قبل الولادة، والمولود، والمولودة، والعقيقة، والاستقبال المحايد.

### 7.1 في انتظار فرد جديد — الدافئة `warm`

- **Scenario:** احتفال قبل الولادة
- **Audience:** العائلة والأصدقاء
- **Sender perspective:** الوالدان أو الأسرة
- **Gender scope:** محايد للضيف وللطفل
- **Event stage:** قبل الولادة
- **Meta sample title:** `حفل استقبال صغيرنا القادم`

#### 7.1.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_baby_shower_before_birth_neutral_reply_qr_ar_v3`
- **Halaa category:** `baby_shower`
- **Voice:** `warm`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا {{1}}،

نستعد لاستقبال فرد جديد في العائلة، ويسعدنا أن نشاركك فرحتنا في «{{2}}».
نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
نسعد بحضورك ودعواتك الطيبة 🤍
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 7.1.2 رد فقط — `reply_only`

- **Meta name:** `halaa_baby_shower_before_birth_neutral_reply_only_ar_v3`
- **Halaa category:** `baby_shower`
- **Voice:** `warm`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا {{1}}،

نستعد لاستقبال فرد جديد في العائلة، ويسعدنا أن نشاركك فرحتنا في «{{2}}».
نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور.
نسعد بحضورك ودعواتك الطيبة 🤍
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 7.1.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_baby_shower_before_birth_neutral_qr_only_ar_v3`
- **Halaa category:** `baby_shower`
- **Voice:** `warm`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا {{1}}،

نستعد لاستقبال فرد جديد في العائلة، ويسعدنا أن نشاركك فرحتنا في «{{2}}».
نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
نسعد بحضورك ودعواتك الطيبة 🤍
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 7.1.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_baby_shower_before_birth_neutral_none_ar_v3`
- **Halaa category:** `baby_shower`
- **Voice:** `warm`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا {{1}}،

نستعد لاستقبال فرد جديد في العائلة، ويسعدنا أن نشاركك فرحتنا في «{{2}}».
نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

نسعد بحضورك ودعواتك الطيبة 🤍
```

**Buttons:** none

---

### 7.2 فرحتنا بمولودنا — الكلاسيكية `classic`

- **Scenario:** استقبال مولود ذكر بعد الولادة
- **Audience:** العائلة والأصدقاء
- **Sender perspective:** الوالدان أو الأسرة
- **Gender scope:** محايد للضيف؛ مذكر للطفل
- **Event stage:** بعد الولادة
- **Meta sample title:** `استقبال مولودنا يوسف`

#### 7.2.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_baby_shower_new_boy_reply_qr_ar_v3`
- **Halaa category:** `baby_shower`
- **Voice:** `classic`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
{{1}}،

حمدًا لله على تمام النعمة. يسرّنا دعوتك إلى «{{2}}» احتفاءً بقدوم مولودنا.
التاريخ: {{3}}
الوقت: {{4}}
المكان: {{5}}

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
نسعد بحضورك ودعائك له.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 7.2.2 رد فقط — `reply_only`

- **Meta name:** `halaa_baby_shower_new_boy_reply_only_ar_v3`
- **Halaa category:** `baby_shower`
- **Voice:** `classic`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
{{1}}،

حمدًا لله على تمام النعمة. يسرّنا دعوتك إلى «{{2}}» احتفاءً بقدوم مولودنا.
التاريخ: {{3}}
الوقت: {{4}}
المكان: {{5}}

نرجو اختيار حالة الحضور.
نسعد بحضورك ودعائك له.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 7.2.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_baby_shower_new_boy_qr_only_ar_v3`
- **Halaa category:** `baby_shower`
- **Voice:** `classic`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
{{1}}،

حمدًا لله على تمام النعمة. يسرّنا دعوتك إلى «{{2}}» احتفاءً بقدوم مولودنا.
التاريخ: {{3}}
الوقت: {{4}}
المكان: {{5}}

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
نسعد بحضورك ودعائك له.
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 7.2.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_baby_shower_new_boy_none_ar_v3`
- **Halaa category:** `baby_shower`
- **Voice:** `classic`
- **Halaa invitation mode:** `none`

**Body**

```text
{{1}}،

حمدًا لله على تمام النعمة. يسرّنا دعوتك إلى «{{2}}» احتفاءً بقدوم مولودنا.
التاريخ: {{3}}
الوقت: {{4}}
المكان: {{5}}

نسعد بحضورك ودعائك له.
```

**Buttons:** none

---

### 7.3 وصلت صغيرتنا — العصرية `modern`

- **Scenario:** استقبال مولودة بعد الولادة
- **Audience:** العائلة والأصدقاء
- **Sender perspective:** الوالدان أو الأسرة
- **Gender scope:** محايد للضيف؛ مؤنث للطفلة
- **Event stage:** بعد الولادة
- **Meta sample title:** `استقبال مولودتنا جود`

#### 7.3.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_baby_shower_new_girl_reply_qr_ar_v3`
- **Halaa category:** `baby_shower`
- **Voice:** `modern`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
يا هلا {{1}} 🤍

وصلت صغيرتنا واكتملت فرحتنا، ويسعدنا لقاؤك في «{{2}}».

📅 {{3}} · {{4}}
📍 {{5}}

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
نفرح بحضورك ودعواتك الجميلة.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 7.3.2 رد فقط — `reply_only`

- **Meta name:** `halaa_baby_shower_new_girl_reply_only_ar_v3`
- **Halaa category:** `baby_shower`
- **Voice:** `modern`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
يا هلا {{1}} 🤍

وصلت صغيرتنا واكتملت فرحتنا، ويسعدنا لقاؤك في «{{2}}».

📅 {{3}} · {{4}}
📍 {{5}}

نرجو اختيار حالة الحضور.
نفرح بحضورك ودعواتك الجميلة.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 7.3.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_baby_shower_new_girl_qr_only_ar_v3`
- **Halaa category:** `baby_shower`
- **Voice:** `modern`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
يا هلا {{1}} 🤍

وصلت صغيرتنا واكتملت فرحتنا، ويسعدنا لقاؤك في «{{2}}».

📅 {{3}} · {{4}}
📍 {{5}}

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
نفرح بحضورك ودعواتك الجميلة.
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 7.3.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_baby_shower_new_girl_none_ar_v3`
- **Halaa category:** `baby_shower`
- **Voice:** `modern`
- **Halaa invitation mode:** `none`

**Body**

```text
يا هلا {{1}} 🤍

وصلت صغيرتنا واكتملت فرحتنا، ويسعدنا لقاؤك في «{{2}}».

📅 {{3}} · {{4}}
📍 {{5}}

نفرح بحضورك ودعواتك الجميلة.
```

**Buttons:** none

---

### 7.4 دعوة العقيقة — الشخصية `intimate`

- **Scenario:** عقيقة بصياغة لا تفترض جنس الطفل
- **Audience:** الدائرة العائلية القريبة
- **Sender perspective:** الوالدان أو الأسرة
- **Gender scope:** محايد للضيف وللطفل داخل النص
- **Event stage:** بعد الولادة
- **Meta sample title:** `عقيقة مولودنا عبدالله`

#### 7.4.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_baby_shower_aqiqah_neutral_reply_qr_ar_v3`
- **Halaa category:** `baby_shower`
- **Voice:** `intimate`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أحببنا أن تكون الدعوة إليك يا {{1}}، لحضور «{{2}}» في لقاء عائلي بسيط.

الموعد يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
نسعد بحضورك ودعواتك الطيبة.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 7.4.2 رد فقط — `reply_only`

- **Meta name:** `halaa_baby_shower_aqiqah_neutral_reply_only_ar_v3`
- **Halaa category:** `baby_shower`
- **Voice:** `intimate`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أحببنا أن تكون الدعوة إليك يا {{1}}، لحضور «{{2}}» في لقاء عائلي بسيط.

الموعد يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور.
نسعد بحضورك ودعواتك الطيبة.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 7.4.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_baby_shower_aqiqah_neutral_qr_only_ar_v3`
- **Halaa category:** `baby_shower`
- **Voice:** `intimate`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أحببنا أن تكون الدعوة إليك يا {{1}}، لحضور «{{2}}» في لقاء عائلي بسيط.

الموعد يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
نسعد بحضورك ودعواتك الطيبة.
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 7.4.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_baby_shower_aqiqah_neutral_none_ar_v3`
- **Halaa category:** `baby_shower`
- **Voice:** `intimate`
- **Halaa invitation mode:** `none`

**Body**

```text
أحببنا أن تكون الدعوة إليك يا {{1}}، لحضور «{{2}}» في لقاء عائلي بسيط.

الموعد يوم {{3}}، الساعة {{4}}، في {{5}}.

نسعد بحضورك ودعواتك الطيبة.
```

**Buttons:** none

---

### 7.5 الحمد لله على تمام النعمة — الأصيلة `heritage`

- **Scenario:** استقبال عائلي محايد بعد الولادة
- **Audience:** العائلة والمعارف
- **Sender perspective:** الأسرة
- **Gender scope:** محايد للضيف وللطفل داخل النص
- **Event stage:** بعد الولادة
- **Meta sample title:** `لقاء الأحبة احتفاءً بتمام النعمة`

#### 7.5.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_baby_shower_family_reception_neutral_reply_qr_ar_v3`
- **Halaa category:** `baby_shower`
- **Voice:** `heritage`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
حيّاك الله {{1}}،

الحمد لله الذي أتمّ علينا النعمة، ويسرّ العائلة دعوتك إلى «{{2}}».
نستقبلك يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
حضورك ودعواتك الطيبة موضع سرورنا.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 7.5.2 رد فقط — `reply_only`

- **Meta name:** `halaa_baby_shower_family_reception_neutral_reply_only_ar_v3`
- **Halaa category:** `baby_shower`
- **Voice:** `heritage`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
حيّاك الله {{1}}،

الحمد لله الذي أتمّ علينا النعمة، ويسرّ العائلة دعوتك إلى «{{2}}».
نستقبلك يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور.
حضورك ودعواتك الطيبة موضع سرورنا.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 7.5.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_baby_shower_family_reception_neutral_qr_only_ar_v3`
- **Halaa category:** `baby_shower`
- **Voice:** `heritage`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
حيّاك الله {{1}}،

الحمد لله الذي أتمّ علينا النعمة، ويسرّ العائلة دعوتك إلى «{{2}}».
نستقبلك يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
حضورك ودعواتك الطيبة موضع سرورنا.
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 7.5.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_baby_shower_family_reception_neutral_none_ar_v3`
- **Halaa category:** `baby_shower`
- **Voice:** `heritage`
- **Halaa invitation mode:** `none`

**Body**

```text
حيّاك الله {{1}}،

الحمد لله الذي أتمّ علينا النعمة، ويسرّ العائلة دعوتك إلى «{{2}}».
نستقبلك يوم {{3}}، الساعة {{4}}، في {{5}}.

حضورك ودعواتك الطيبة موضع سرورنا.
```

**Buttons:** none

---


## 8. Ladies' event — المناسبة النسائية `ladies_event`

خيارات للقاءات الاجتماعية والرسمية والمهنية والصديقات وليلة العروس.

### 8.1 لقاء يجمعنا بمن نحب — الدافئة `warm`

- **Scenario:** لقاء نسائي اجتماعي
- **Audience:** القريبات والصديقات
- **Sender perspective:** المضيفة أو المجموعة المنظمة
- **Gender scope:** مؤنث للضيفة
- **Meta sample title:** `أمسية الورد`

#### 8.1.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_ladies_event_friends_gathering_reply_qr_ar_v3`
- **Halaa category:** `ladies_event`
- **Voice:** `warm`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا {{1}}،

أعددنا لقاءً هادئًا يجمعنا بمن نحب، ويسعدنا حضورك في «{{2}}».
الموعد يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
نلقاك بكل ود ✨
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 8.1.2 رد فقط — `reply_only`

- **Meta name:** `halaa_ladies_event_friends_gathering_reply_only_ar_v3`
- **Halaa category:** `ladies_event`
- **Voice:** `warm`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا {{1}}،

أعددنا لقاءً هادئًا يجمعنا بمن نحب، ويسعدنا حضورك في «{{2}}».
الموعد يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور.
نلقاك بكل ود ✨
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 8.1.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_ladies_event_friends_gathering_qr_only_ar_v3`
- **Halaa category:** `ladies_event`
- **Voice:** `warm`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا {{1}}،

أعددنا لقاءً هادئًا يجمعنا بمن نحب، ويسعدنا حضورك في «{{2}}».
الموعد يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
نلقاك بكل ود ✨
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 8.1.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_ladies_event_friends_gathering_none_ar_v3`
- **Halaa category:** `ladies_event`
- **Voice:** `warm`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا {{1}}،

أعددنا لقاءً هادئًا يجمعنا بمن نحب، ويسعدنا حضورك في «{{2}}».
الموعد يوم {{3}}، الساعة {{4}}، في {{5}}.

نلقاك بكل ود ✨
```

**Buttons:** none

---

### 8.2 دعوة نسائية رسمية — الكلاسيكية `classic`

- **Scenario:** استقبال رسمي أو لقاء مهني نسائي
- **Audience:** المدعوات والمهنيات
- **Sender perspective:** الجهة أو فريق التنظيم
- **Gender scope:** مؤنث للضيفة
- **Meta sample title:** `ملتقى سيدات الأعمال`

#### 8.2.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_ladies_event_formal_professional_reply_qr_ar_v3`
- **Halaa category:** `ladies_event`
- **Voice:** `classic`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
{{1}}،

يسرّنا دعوتك إلى «{{2}}»، ونعتز بحضورك بين ضيفاتنا.
التاريخ: {{3}}
الوقت: {{4}}
المكان: {{5}}

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
يسرّنا الترحيب بك.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 8.2.2 رد فقط — `reply_only`

- **Meta name:** `halaa_ladies_event_formal_professional_reply_only_ar_v3`
- **Halaa category:** `ladies_event`
- **Voice:** `classic`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
{{1}}،

يسرّنا دعوتك إلى «{{2}}»، ونعتز بحضورك بين ضيفاتنا.
التاريخ: {{3}}
الوقت: {{4}}
المكان: {{5}}

نرجو اختيار حالة الحضور.
يسرّنا الترحيب بك.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 8.2.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_ladies_event_formal_professional_qr_only_ar_v3`
- **Halaa category:** `ladies_event`
- **Voice:** `classic`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
{{1}}،

يسرّنا دعوتك إلى «{{2}}»، ونعتز بحضورك بين ضيفاتنا.
التاريخ: {{3}}
الوقت: {{4}}
المكان: {{5}}

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
يسرّنا الترحيب بك.
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 8.2.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_ladies_event_formal_professional_none_ar_v3`
- **Halaa category:** `ladies_event`
- **Voice:** `classic`
- **Halaa invitation mode:** `none`

**Body**

```text
{{1}}،

يسرّنا دعوتك إلى «{{2}}»، ونعتز بحضورك بين ضيفاتنا.
التاريخ: {{3}}
الوقت: {{4}}
المكان: {{5}}

يسرّنا الترحيب بك.
```

**Buttons:** none

---

### 8.3 صحبة جميلة — العصرية `modern`

- **Scenario:** لقاء خفيف للصديقات
- **Audience:** الصديقات
- **Sender perspective:** المضيفة أو مجموعة الصديقات
- **Gender scope:** مؤنث للضيفة
- **Meta sample title:** `لقاء الصديقات`

#### 8.3.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_ladies_event_casual_friends_reply_qr_ar_v3`
- **Halaa category:** `ladies_event`
- **Voice:** `modern`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
يا هلا {{1}} 💫

موعدنا مع صحبة جميلة ووقت لطيف في «{{2}}».

📅 {{3}} · {{4}}
📍 {{5}}

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
نفرح بلقائك.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 8.3.2 رد فقط — `reply_only`

- **Meta name:** `halaa_ladies_event_casual_friends_reply_only_ar_v3`
- **Halaa category:** `ladies_event`
- **Voice:** `modern`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
يا هلا {{1}} 💫

موعدنا مع صحبة جميلة ووقت لطيف في «{{2}}».

📅 {{3}} · {{4}}
📍 {{5}}

نرجو اختيار حالة الحضور.
نفرح بلقائك.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 8.3.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_ladies_event_casual_friends_qr_only_ar_v3`
- **Halaa category:** `ladies_event`
- **Voice:** `modern`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
يا هلا {{1}} 💫

موعدنا مع صحبة جميلة ووقت لطيف في «{{2}}».

📅 {{3}} · {{4}}
📍 {{5}}

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
نفرح بلقائك.
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 8.3.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_ladies_event_casual_friends_none_ar_v3`
- **Halaa category:** `ladies_event`
- **Voice:** `modern`
- **Halaa invitation mode:** `none`

**Body**

```text
يا هلا {{1}} 💫

موعدنا مع صحبة جميلة ووقت لطيف في «{{2}}».

📅 {{3}} · {{4}}
📍 {{5}}

نفرح بلقائك.
```

**Buttons:** none

---

### 8.4 ليلة قريبة من العروس — الشخصية `intimate`

- **Scenario:** ليلة حناء أو مناسبة خاصة بالعروس
- **Audience:** قريبات العروس وصديقاتها
- **Sender perspective:** العروس أو أسرتها
- **Gender scope:** مؤنث للضيفة
- **Meta sample title:** `ليلة حناء العروس دانة`

#### 8.4.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_ladies_event_bride_night_reply_qr_ar_v3`
- **Halaa category:** `ladies_event`
- **Voice:** `intimate`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
يا {{1}}،

هذه الليلة للعروس، ويسعدها أن تكوني معها في «{{2}}» بصحبة القريبات والصديقات.

نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
حضورك يضيف إلى فرحتها.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 8.4.2 رد فقط — `reply_only`

- **Meta name:** `halaa_ladies_event_bride_night_reply_only_ar_v3`
- **Halaa category:** `ladies_event`
- **Voice:** `intimate`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
يا {{1}}،

هذه الليلة للعروس، ويسعدها أن تكوني معها في «{{2}}» بصحبة القريبات والصديقات.

نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور.
حضورك يضيف إلى فرحتها.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 8.4.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_ladies_event_bride_night_qr_only_ar_v3`
- **Halaa category:** `ladies_event`
- **Voice:** `intimate`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
يا {{1}}،

هذه الليلة للعروس، ويسعدها أن تكوني معها في «{{2}}» بصحبة القريبات والصديقات.

نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
حضورك يضيف إلى فرحتها.
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 8.4.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_ladies_event_bride_night_none_ar_v3`
- **Halaa category:** `ladies_event`
- **Voice:** `intimate`
- **Halaa invitation mode:** `none`

**Body**

```text
يا {{1}}،

هذه الليلة للعروس، ويسعدها أن تكوني معها في «{{2}}» بصحبة القريبات والصديقات.

نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

حضورك يضيف إلى فرحتها.
```

**Buttons:** none

---

### 8.5 أمسية بين الأهل — الأصيلة `heritage`

- **Scenario:** لقاء نسائي عائلي بطابع خليجي
- **Audience:** نساء العائلة والمعارف
- **Sender perspective:** الأسرة
- **Gender scope:** مؤنث للضيفة
- **Meta sample title:** `ليلة تراث وأصالة`

#### 8.5.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_ladies_event_family_heritage_reply_qr_ar_v3`
- **Halaa category:** `ladies_event`
- **Voice:** `heritage`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
حيّاكِ الله {{1}}،

في لقاء يجمع الود والأصالة، تسرّنا دعوتك إلى «{{2}}» بين الأهل والقريبات.
نستقبلك يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
لك منّا كل الترحيب، ونسعد بلقائك.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 8.5.2 رد فقط — `reply_only`

- **Meta name:** `halaa_ladies_event_family_heritage_reply_only_ar_v3`
- **Halaa category:** `ladies_event`
- **Voice:** `heritage`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
حيّاكِ الله {{1}}،

في لقاء يجمع الود والأصالة، تسرّنا دعوتك إلى «{{2}}» بين الأهل والقريبات.
نستقبلك يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور.
لك منّا كل الترحيب، ونسعد بلقائك.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 8.5.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_ladies_event_family_heritage_qr_only_ar_v3`
- **Halaa category:** `ladies_event`
- **Voice:** `heritage`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
حيّاكِ الله {{1}}،

في لقاء يجمع الود والأصالة، تسرّنا دعوتك إلى «{{2}}» بين الأهل والقريبات.
نستقبلك يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
لك منّا كل الترحيب، ونسعد بلقائك.
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 8.5.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_ladies_event_family_heritage_none_ar_v3`
- **Halaa category:** `ladies_event`
- **Voice:** `heritage`
- **Halaa invitation mode:** `none`

**Body**

```text
حيّاكِ الله {{1}}،

في لقاء يجمع الود والأصالة، تسرّنا دعوتك إلى «{{2}}» بين الأهل والقريبات.
نستقبلك يوم {{3}}، الساعة {{4}}، في {{5}}.

لك منّا كل الترحيب، ونسعد بلقائك.
```

**Buttons:** none

---


## 9. General occasion — المناسبة العامة `general_event`

لا تستخدم نصًا عامًا فارغًا؛ تختار بين إنجاز ومنزل جديد وافتتاح وتكريم ولمّة عائلية.

### 9.1 فرحة الإنجاز — الدافئة `warm`

- **Scenario:** تخرج أو إنجاز شخصي
- **Audience:** العائلة والأصدقاء والزملاء
- **Sender perspective:** صاحب الإنجاز أو الأسرة
- **Gender scope:** محايد للضيف ولصاحب الإنجاز
- **Meta sample title:** `حفل تخرج سارة`

#### 9.1.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_general_event_graduation_achievement_reply_qr_ar_v3`
- **Halaa category:** `general_event`
- **Voice:** `warm`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا {{1}}،

وراء هذا الإنجاز أيام كثيرة تستحق أن نختمها بالفرح، ويسعدنا حضورك في «{{2}}».
نحتفل يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
نفرح بلقائك ومشاركتنا هذه اللحظة 🎓
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 9.1.2 رد فقط — `reply_only`

- **Meta name:** `halaa_general_event_graduation_achievement_reply_only_ar_v3`
- **Halaa category:** `general_event`
- **Voice:** `warm`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا {{1}}،

وراء هذا الإنجاز أيام كثيرة تستحق أن نختمها بالفرح، ويسعدنا حضورك في «{{2}}».
نحتفل يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور.
نفرح بلقائك ومشاركتنا هذه اللحظة 🎓
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 9.1.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_general_event_graduation_achievement_qr_only_ar_v3`
- **Halaa category:** `general_event`
- **Voice:** `warm`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا {{1}}،

وراء هذا الإنجاز أيام كثيرة تستحق أن نختمها بالفرح، ويسعدنا حضورك في «{{2}}».
نحتفل يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
نفرح بلقائك ومشاركتنا هذه اللحظة 🎓
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 9.1.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_general_event_graduation_achievement_none_ar_v3`
- **Halaa category:** `general_event`
- **Voice:** `warm`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا {{1}}،

وراء هذا الإنجاز أيام كثيرة تستحق أن نختمها بالفرح، ويسعدنا حضورك في «{{2}}».
نحتفل يوم {{3}}، الساعة {{4}}، في {{5}}.

نفرح بلقائك ومشاركتنا هذه اللحظة 🎓
```

**Buttons:** none

---

### 9.2 دعوة إلى منزلنا الجديد — الكلاسيكية `classic`

- **Scenario:** احتفال بمنزل جديد
- **Audience:** العائلة والأصدقاء والجيران
- **Sender perspective:** أصحاب المنزل
- **Gender scope:** محايد للضيف
- **Meta sample title:** `لقاء الأحبة في منزلنا الجديد`

#### 9.2.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_general_event_new_home_reply_qr_ar_v3`
- **Halaa category:** `general_event`
- **Voice:** `classic`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
{{1}}،

بمناسبة انتقالنا إلى منزلنا الجديد، يسرّنا دعوتك إلى «{{2}}».
التاريخ: {{3}}
الوقت: {{4}}
المكان: {{5}}

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
يسعدنا أن يكون لقاؤنا الأول فيه معك.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 9.2.2 رد فقط — `reply_only`

- **Meta name:** `halaa_general_event_new_home_reply_only_ar_v3`
- **Halaa category:** `general_event`
- **Voice:** `classic`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
{{1}}،

بمناسبة انتقالنا إلى منزلنا الجديد، يسرّنا دعوتك إلى «{{2}}».
التاريخ: {{3}}
الوقت: {{4}}
المكان: {{5}}

نرجو اختيار حالة الحضور.
يسعدنا أن يكون لقاؤنا الأول فيه معك.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 9.2.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_general_event_new_home_qr_only_ar_v3`
- **Halaa category:** `general_event`
- **Voice:** `classic`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
{{1}}،

بمناسبة انتقالنا إلى منزلنا الجديد، يسرّنا دعوتك إلى «{{2}}».
التاريخ: {{3}}
الوقت: {{4}}
المكان: {{5}}

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
يسعدنا أن يكون لقاؤنا الأول فيه معك.
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 9.2.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_general_event_new_home_none_ar_v3`
- **Halaa category:** `general_event`
- **Voice:** `classic`
- **Halaa invitation mode:** `none`

**Body**

```text
{{1}}،

بمناسبة انتقالنا إلى منزلنا الجديد، يسرّنا دعوتك إلى «{{2}}».
التاريخ: {{3}}
الوقت: {{4}}
المكان: {{5}}

يسعدنا أن يكون لقاؤنا الأول فيه معك.
```

**Buttons:** none

---

### 9.3 موعد الافتتاح — العصرية `modern`

- **Scenario:** افتتاح مشروع أو إطلاق جديد
- **Audience:** العملاء والشركاء والأصدقاء
- **Sender perspective:** صاحب المشروع أو الجهة
- **Gender scope:** محايد للضيف
- **Meta sample title:** `افتتاح استوديو نور`

#### 9.3.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_general_event_opening_launch_reply_qr_ar_v3`
- **Halaa category:** `general_event`
- **Voice:** `modern`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
يا هلا {{1}} ✨

بدأت الفكرة بخطوة، والآن حان موعد افتتاحها في «{{2}}».

📅 {{3}} · {{4}}
📍 {{5}}

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
يسرّنا أن نشاركك هذه البداية.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 9.3.2 رد فقط — `reply_only`

- **Meta name:** `halaa_general_event_opening_launch_reply_only_ar_v3`
- **Halaa category:** `general_event`
- **Voice:** `modern`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
يا هلا {{1}} ✨

بدأت الفكرة بخطوة، والآن حان موعد افتتاحها في «{{2}}».

📅 {{3}} · {{4}}
📍 {{5}}

نرجو اختيار حالة الحضور.
يسرّنا أن نشاركك هذه البداية.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 9.3.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_general_event_opening_launch_qr_only_ar_v3`
- **Halaa category:** `general_event`
- **Voice:** `modern`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
يا هلا {{1}} ✨

بدأت الفكرة بخطوة، والآن حان موعد افتتاحها في «{{2}}».

📅 {{3}} · {{4}}
📍 {{5}}

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
يسرّنا أن نشاركك هذه البداية.
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 9.3.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_general_event_opening_launch_none_ar_v3`
- **Halaa category:** `general_event`
- **Voice:** `modern`
- **Halaa invitation mode:** `none`

**Body**

```text
يا هلا {{1}} ✨

بدأت الفكرة بخطوة، والآن حان موعد افتتاحها في «{{2}}».

📅 {{3}} · {{4}}
📍 {{5}}

يسرّنا أن نشاركك هذه البداية.
```

**Buttons:** none

---

### 9.4 مسيرة تستحق التقدير — الشخصية `intimate`

- **Scenario:** تكريم أو تقاعد أو وداع مهني
- **Audience:** الزملاء والأصدقاء والعائلة
- **Sender perspective:** الأسرة أو الزملاء أو الجهة
- **Gender scope:** محايد للضيف ولصاحب التكريم
- **Meta sample title:** `حفل تكريم الأستاذ سامي`

#### 9.4.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_general_event_recognition_farewell_reply_qr_ar_v3`
- **Halaa category:** `general_event`
- **Voice:** `intimate`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
يا {{1}}،

نجتمع في «{{2}}» تقديرًا لمسيرة تركت أثرًا طيبًا، ويسرّنا حضورك.

الموعد يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
نأمل أن يكون اللقاء وفاءً يليق بهذه المسيرة.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 9.4.2 رد فقط — `reply_only`

- **Meta name:** `halaa_general_event_recognition_farewell_reply_only_ar_v3`
- **Halaa category:** `general_event`
- **Voice:** `intimate`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
يا {{1}}،

نجتمع في «{{2}}» تقديرًا لمسيرة تركت أثرًا طيبًا، ويسرّنا حضورك.

الموعد يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور.
نأمل أن يكون اللقاء وفاءً يليق بهذه المسيرة.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 9.4.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_general_event_recognition_farewell_qr_only_ar_v3`
- **Halaa category:** `general_event`
- **Voice:** `intimate`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
يا {{1}}،

نجتمع في «{{2}}» تقديرًا لمسيرة تركت أثرًا طيبًا، ويسرّنا حضورك.

الموعد يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
نأمل أن يكون اللقاء وفاءً يليق بهذه المسيرة.
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 9.4.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_general_event_recognition_farewell_none_ar_v3`
- **Halaa category:** `general_event`
- **Voice:** `intimate`
- **Halaa invitation mode:** `none`

**Body**

```text
يا {{1}}،

نجتمع في «{{2}}» تقديرًا لمسيرة تركت أثرًا طيبًا، ويسرّنا حضورك.

الموعد يوم {{3}}، الساعة {{4}}، في {{5}}.

نأمل أن يكون اللقاء وفاءً يليق بهذه المسيرة.
```

**Buttons:** none

---

### 9.5 لمّة العيد — الأصيلة `heritage`

- **Scenario:** عيد أو لقاء عائلي ومجتمعي
- **Audience:** العائلة والأصدقاء والجيران
- **Sender perspective:** الأسرة أو المضيف
- **Gender scope:** محايد للضيف
- **Meta sample title:** `لقاء عيد الفطر`

#### 9.5.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_general_event_eid_family_reply_qr_ar_v3`
- **Halaa category:** `general_event`
- **Voice:** `heritage`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
حيّاك الله {{1}}،

للعيد فرحته، وللقاء الأحبة مكانه. يسرّنا حضورك في «{{2}}».
موعدنا يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
نلقاك بكل ترحيب، وعساكم من عوّاده.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 9.5.2 رد فقط — `reply_only`

- **Meta name:** `halaa_general_event_eid_family_reply_only_ar_v3`
- **Halaa category:** `general_event`
- **Voice:** `heritage`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
حيّاك الله {{1}}،

للعيد فرحته، وللقاء الأحبة مكانه. يسرّنا حضورك في «{{2}}».
موعدنا يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور.
نلقاك بكل ترحيب، وعساكم من عوّاده.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 9.5.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_general_event_eid_family_qr_only_ar_v3`
- **Halaa category:** `general_event`
- **Voice:** `heritage`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
حيّاك الله {{1}}،

للعيد فرحته، وللقاء الأحبة مكانه. يسرّنا حضورك في «{{2}}».
موعدنا يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
نلقاك بكل ترحيب، وعساكم من عوّاده.
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 9.5.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_general_event_eid_family_none_ar_v3`
- **Halaa category:** `general_event`
- **Voice:** `heritage`
- **Halaa invitation mode:** `none`

**Body**

```text
حيّاك الله {{1}}،

للعيد فرحته، وللقاء الأحبة مكانه. يسرّنا حضورك في «{{2}}».
موعدنا يوم {{3}}، الساعة {{4}}، في {{5}}.

نلقاك بكل ترحيب، وعساكم من عوّاده.
```

**Buttons:** none

---


## 10. Conference and professional events — المؤتمر `conference`

تفصل الرسائل بين الحضور والمتحدث والضيف التنفيذي وورشة العمل والتواصل المهني.

### 10.1 دعوة الحضور — الدافئة `warm`

- **Scenario:** دعوة عامة لحضور مؤتمر أو ملتقى
- **Audience:** الحضور العام
- **Sender perspective:** الجهة المنظمة
- **Gender scope:** محايد للضيف
- **Recipient role:** حاضر
- **Meta sample title:** `ملتقى مجتمع المصممين`

#### 10.1.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_conference_attendee_reply_qr_ar_v3`
- **Halaa category:** `conference`
- **Voice:** `warm`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
مرحبًا {{1}}،

يسرّنا دعوتك إلى «{{2}}» لحضور جلساته ولقاء المهتمين بالمجال.
يُقام الملتقى يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
نأمل أن نلتقي بك هناك.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 10.1.2 رد فقط — `reply_only`

- **Meta name:** `halaa_conference_attendee_reply_only_ar_v3`
- **Halaa category:** `conference`
- **Voice:** `warm`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
مرحبًا {{1}}،

يسرّنا دعوتك إلى «{{2}}» لحضور جلساته ولقاء المهتمين بالمجال.
يُقام الملتقى يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور.
نأمل أن نلتقي بك هناك.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 10.1.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_conference_attendee_qr_only_ar_v3`
- **Halaa category:** `conference`
- **Voice:** `warm`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
مرحبًا {{1}}،

يسرّنا دعوتك إلى «{{2}}» لحضور جلساته ولقاء المهتمين بالمجال.
يُقام الملتقى يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
نأمل أن نلتقي بك هناك.
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 10.1.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_conference_attendee_none_ar_v3`
- **Halaa category:** `conference`
- **Voice:** `warm`
- **Halaa invitation mode:** `none`

**Body**

```text
مرحبًا {{1}}،

يسرّنا دعوتك إلى «{{2}}» لحضور جلساته ولقاء المهتمين بالمجال.
يُقام الملتقى يوم {{3}}، الساعة {{4}}، في {{5}}.

نأمل أن نلتقي بك هناك.
```

**Buttons:** none

---

### 10.2 دعوة المتحدثين — الكلاسيكية `classic`

- **Scenario:** دعوة متحدث أو عضو جلسة
- **Audience:** المتحدثون وأعضاء الجلسات
- **Sender perspective:** الجهة المنظمة
- **Gender scope:** محايد للضيف داخل النص
- **Recipient role:** متحدث أو عضو جلسة
- **Meta sample title:** `ملتقى القيادات 2026`

#### 10.2.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_conference_speaker_reply_qr_ar_v3`
- **Halaa category:** `conference`
- **Voice:** `classic`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
{{1}}،

يسرّنا دعوتك للمشاركة في «{{2}}» ضمن برنامج المتحدثين، وإثراء اللقاء بخبرتك.
التاريخ: {{3}}
الوقت: {{4}}
المكان: {{5}}

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
نعتز بمشاركتك في البرنامج.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 10.2.2 رد فقط — `reply_only`

- **Meta name:** `halaa_conference_speaker_reply_only_ar_v3`
- **Halaa category:** `conference`
- **Voice:** `classic`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
{{1}}،

يسرّنا دعوتك للمشاركة في «{{2}}» ضمن برنامج المتحدثين، وإثراء اللقاء بخبرتك.
التاريخ: {{3}}
الوقت: {{4}}
المكان: {{5}}

نرجو اختيار حالة الحضور.
نعتز بمشاركتك في البرنامج.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 10.2.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_conference_speaker_qr_only_ar_v3`
- **Halaa category:** `conference`
- **Voice:** `classic`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
{{1}}،

يسرّنا دعوتك للمشاركة في «{{2}}» ضمن برنامج المتحدثين، وإثراء اللقاء بخبرتك.
التاريخ: {{3}}
الوقت: {{4}}
المكان: {{5}}

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
نعتز بمشاركتك في البرنامج.
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 10.2.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_conference_speaker_none_ar_v3`
- **Halaa category:** `conference`
- **Voice:** `classic`
- **Halaa invitation mode:** `none`

**Body**

```text
{{1}}،

يسرّنا دعوتك للمشاركة في «{{2}}» ضمن برنامج المتحدثين، وإثراء اللقاء بخبرتك.
التاريخ: {{3}}
الوقت: {{4}}
المكان: {{5}}

نعتز بمشاركتك في البرنامج.
```

**Buttons:** none

---

### 10.3 لقاء القيادات — العصرية `modern`

- **Scenario:** دعوة تنفيذية أو لكبار الضيوف
- **Audience:** القيادات وكبار الضيوف
- **Sender perspective:** الجهة المنظمة
- **Gender scope:** محايد للضيف
- **Recipient role:** ضيف تنفيذي
- **Meta sample title:** `مجلس قادة الأعمال`

#### 10.3.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_conference_executive_vip_reply_qr_ar_v3`
- **Halaa category:** `conference`
- **Voice:** `modern`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
مرحبًا {{1}} 💡

في «{{2}}» نلتقي لحوار مركّز حول ما يصنع الفرق في المرحلة القادمة.

📅 {{3}} · {{4}}
📍 {{5}}

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
يسرّنا حضورك في هذا اللقاء.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 10.3.2 رد فقط — `reply_only`

- **Meta name:** `halaa_conference_executive_vip_reply_only_ar_v3`
- **Halaa category:** `conference`
- **Voice:** `modern`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
مرحبًا {{1}} 💡

في «{{2}}» نلتقي لحوار مركّز حول ما يصنع الفرق في المرحلة القادمة.

📅 {{3}} · {{4}}
📍 {{5}}

نرجو اختيار حالة الحضور.
يسرّنا حضورك في هذا اللقاء.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 10.3.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_conference_executive_vip_qr_only_ar_v3`
- **Halaa category:** `conference`
- **Voice:** `modern`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
مرحبًا {{1}} 💡

في «{{2}}» نلتقي لحوار مركّز حول ما يصنع الفرق في المرحلة القادمة.

📅 {{3}} · {{4}}
📍 {{5}}

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
يسرّنا حضورك في هذا اللقاء.
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 10.3.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_conference_executive_vip_none_ar_v3`
- **Halaa category:** `conference`
- **Voice:** `modern`
- **Halaa invitation mode:** `none`

**Body**

```text
مرحبًا {{1}} 💡

في «{{2}}» نلتقي لحوار مركّز حول ما يصنع الفرق في المرحلة القادمة.

📅 {{3}} · {{4}}
📍 {{5}}

يسرّنا حضورك في هذا اللقاء.
```

**Buttons:** none

---

### 10.4 جلسة عملية — الشخصية `intimate`

- **Scenario:** ورشة أو جلسة محدودة العدد
- **Audience:** المشاركون المسجلون
- **Sender perspective:** المدرب أو الجهة المنظمة
- **Gender scope:** محايد للضيف
- **Recipient role:** مشارك في ورشة
- **Meta sample title:** `ورشة بناء العلامات التجارية`

#### 10.4.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_conference_workshop_reply_qr_ar_v3`
- **Halaa category:** `conference`
- **Voice:** `intimate`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
يا {{1}}،

هذه الدعوة إلى «{{2}}»، وهي جلسة عملية ومركّزة للمشاركين المسجلين.

نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
يسعدنا حضورك ومشاركتك.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 10.4.2 رد فقط — `reply_only`

- **Meta name:** `halaa_conference_workshop_reply_only_ar_v3`
- **Halaa category:** `conference`
- **Voice:** `intimate`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
يا {{1}}،

هذه الدعوة إلى «{{2}}»، وهي جلسة عملية ومركّزة للمشاركين المسجلين.

نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور.
يسعدنا حضورك ومشاركتك.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 10.4.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_conference_workshop_qr_only_ar_v3`
- **Halaa category:** `conference`
- **Voice:** `intimate`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
يا {{1}}،

هذه الدعوة إلى «{{2}}»، وهي جلسة عملية ومركّزة للمشاركين المسجلين.

نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
يسعدنا حضورك ومشاركتك.
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 10.4.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_conference_workshop_none_ar_v3`
- **Halaa category:** `conference`
- **Voice:** `intimate`
- **Halaa invitation mode:** `none`

**Body**

```text
يا {{1}}،

هذه الدعوة إلى «{{2}}»، وهي جلسة عملية ومركّزة للمشاركين المسجلين.

نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

يسعدنا حضورك ومشاركتك.
```

**Buttons:** none

---

### 10.5 ملتقى أهل الخبرة — الأصيلة `heritage`

- **Scenario:** ملتقى للتعارف وتبادل الخبرات
- **Audience:** المهنيون ورواد المجال
- **Sender perspective:** الجهة المنظمة
- **Gender scope:** محايد للضيف
- **Recipient role:** حاضر للتواصل المهني
- **Meta sample title:** `منتدى رواد الأعمال`

#### 10.5.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_conference_networking_reply_qr_ar_v3`
- **Halaa category:** `conference`
- **Voice:** `heritage`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
حيّاك الله {{1}}،

نرحّب بك في «{{2}}»، ملتقى يجمع أهل الخبرة ورواد المجال للتعارف وتبادل المعرفة.
نستقبلك يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور. بعد التأكيد، سيصلك رمز الدخول الخاص بك.
لك منّا كل الترحيب، ونسعد بلقائك.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 10.5.2 رد فقط — `reply_only`

- **Meta name:** `halaa_conference_networking_reply_only_ar_v3`
- **Halaa category:** `conference`
- **Voice:** `heritage`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
حيّاك الله {{1}}،

نرحّب بك في «{{2}}»، ملتقى يجمع أهل الخبرة ورواد المجال للتعارف وتبادل المعرفة.
نستقبلك يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو اختيار حالة الحضور.
لك منّا كل الترحيب، ونسعد بلقائك.
```

**Quick replies**

| Visible label | Stable payload | RSVP result |
|---|---|---|
| `سأحضر` | `accept` | حاضر |
| `أعتذر عن الحضور` | `decline` | معتذر |
| `لم أقرر بعد` | `maybe` | ربما |

---

#### 10.5.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_conference_networking_qr_only_ar_v3`
- **Halaa category:** `conference`
- **Voice:** `heritage`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
حيّاك الله {{1}}،

نرحّب بك في «{{2}}»، ملتقى يجمع أهل الخبرة ورواد المجال للتعارف وتبادل المعرفة.
نستقبلك يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز الدخول متاح من زر «عرض رمز الدخول». يرجى إبرازه عند الوصول.
لك منّا كل الترحيب، ونسعد بلقائك.
```

**Dynamic URL button:** `عرض رمز الدخول`

---

#### 10.5.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_conference_networking_none_ar_v3`
- **Halaa category:** `conference`
- **Voice:** `heritage`
- **Halaa invitation mode:** `none`

**Body**

```text
حيّاك الله {{1}}،

نرحّب بك في «{{2}}»، ملتقى يجمع أهل الخبرة ورواد المجال للتعارف وتبادل المعرفة.
نستقبلك يوم {{3}}، الساعة {{4}}، في {{5}}.

لك منّا كل الترحيب، ونسعد بلقائك.
```

**Buttons:** none

---


## 11. Pre-submission test matrix

Each of the 35 creative originals must be rendered in all four modes with:

1. a male guest name and a female guest name;
2. a two-word event title and a realistic long title;
3. a title already containing حفل، أمسية، لقاء، or ملتقى;
4. a title containing Latin text, a year, punctuation, or an emoji;
5. a long physical venue including city and country;
6. an online or hybrid location value;
7. a time value including timezone;
8. narrow-screen WhatsApp previews in light and dark appearance;
9. actual webhook payloads for accept, decline, and maybe;
10. the access-code page opened from the production dynamic URL.

Baby templates must additionally be tested against pre-birth, boy, girl, and neutral post-birth data. Conference templates must be tested with the exact recipient role declared in their metadata.

## 12. Submission sequence

1. Complete a native Saudi-Arabic editorial review of the five wedding originals.
2. Submit the 20 wedding templates as the first pilot batch.
3. Record Meta's returned category instead of assuming utility classification or pricing.
4. Verify image header, body variables, visible reply labels, stable payloads, and QR URL parameters.
5. Send real-device tests to opted-in male and female reviewers.
6. Monitor delivery, reads, positive replies, declines, blocks, and template quality.
7. Apply any corpus-wide corrections before submitting the next category.
8. Submit the remaining categories one at a time, never as a single 120-template batch.

## 13. Acceptance checklist

- Exactly 140 unique Meta template names and 140 bodies are present.
- Every body contains body variables `{{1}}` through `{{5}}` exactly once.
- Every creative original represents a declared scenario, audience, and sender perspective.
- Mixed-audience bodies contain no avoidable gendered guest verbs.
- Baby templates declare birth stage and child-gender scope.
- Conference templates declare and respect recipient role.
- No body pressures the guest with phrases such as لا يكتمل من دونك or يكفينا أن تكون معنا.
- Reply labels are humane Arabic while webhook processing uses stable payloads.
- `reply_and_qr` promises the code only after confirmation.
- `reply_only` contains no QR promise.
- `qr_only` names the exact button and requests no RSVP.
- `none` contains neither RSVP nor QR operational language.
- All QR references use رمز الدخول; بطاقة الدخول is not mixed into the corpus.
- Modern templates use no more than three meaningful emoji symbols.
- The footer is neutral and non-promotional.
- Opt-in, opt-out, template classification, and quality monitoring are verified operationally.

## 14. Official references

- [Taqnyat WhatsApp API documentation](https://dev.taqnyat.sa/en/doc/whatsapp/)
- [Taqnyat template creation and quality guidance](https://blog.taqnyat.sa/en/post/whatsApp_business_templates/)
- [Taqnyat template manager](https://blog.taqnyat.sa/en/post/template_manager/)
